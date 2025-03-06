
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Send, RefreshCcw, X, Calendar, Users, MessageSquare } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SmsSendPage() {
  const { toast } = useToast();
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [step, setStep] = useState<"select" | "compose" | "preview">("select");
  
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      return response.json();
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["substituteAssignments"],
    queryFn: async () => {
      const response = await fetch("/api/substitute-assignments");
      if (!response.ok) {
        throw new Error("Failed to fetch substitute assignments");
      }
      return response.json();
    },
  });

  const groupTeachersByAssignmentStatus = () => {
    if (!teachers || !assignments) return { assigned: [], unassigned: [] };
    
    const assignedTeacherNames = assignments.assignments
      ? assignments.assignments.map((a: any) => a.substituteTeacher)
      : [];
    
    const assigned = teachers.filter((t: any) => 
      assignedTeacherNames.includes(t.name)
    );
    
    const unassigned = teachers.filter((t: any) => 
      !assignedTeacherNames.includes(t.name)
    );
    
    return { assigned, unassigned };
  };

  const { assigned, unassigned } = groupTeachersByAssignmentStatus();

  const handleClearAll = () => {
    setSelectedTeachers([]);
  };

  const handleSelectAll = () => {
    if (teachers) {
      const allTeacherIds = teachers.map((teacher: any) => teacher.id.toString());
      setSelectedTeachers(allTeacherIds);
    }
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleDropdownTeacherSelect = (teacherId: string) => {
    if (!selectedTeachers.includes(teacherId)) {
      setSelectedTeachers([...selectedTeachers, teacherId]);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    
    // Set predefined message based on template
    switch(template) {
      case "assignment":
        setMessageText(
          "📢 Substitute Assignment Notice\n\n" +
          "You have been assigned to cover the following classes:\n\n" +
          "📅 [DAY]\n" +
          "⏰ Period [PERIOD]\n" +
          "🏫 Class [CLASS]\n" +
          "👨🏫 Covering for [TEACHER]"
        );
        break;
      case "meeting":
        setMessageText(
          "🗓️ Staff Meeting Reminder\n\n" +
          "This is a reminder about the staff meeting scheduled for tomorrow at 2:30 PM in the conference room. Please bring your department reports."
        );
        break;
      case "reminder":
        setMessageText(
          "⏰ Class Reminder\n\n" +
          "This is a friendly reminder about your assigned classes for tomorrow. Please ensure timely attendance."
        );
        break;
      default:
        setMessageText("");
    }
  };

  const getSelectedTeacherNames = () => {
    if (!teachers) return [];
    return selectedTeachers.map(id => {
      const teacher = teachers.find((t: any) => t.id.toString() === id);
      return teacher ? teacher.name : "";
    }).filter(name => name !== "");
  };

  const generatePreviewSMS = () => {
    const teacherNames = getSelectedTeacherNames();
    if (teacherNames.length === 0) return "";
    
    let preview = "";
    
    // Just showing for the first selected teacher as an example
    const teacherName = teacherNames[0];
    
    if (selectedTemplate === "assignment") {
      // For assignment template, we'd replace placeholders with actual data
      // This is a simplified example
      preview = messageText
        .replace("[DAY]", "Monday")
        .replace("[PERIOD]", "3")
        .replace("[CLASS]", "10A")
        .replace("[TEACHER]", "Sir Ahmed");
      
      // Add note if provided
      if (noteText.trim()) {
        preview += "\n\n📝 Note: " + noteText;
      }
    } else {
      // For other templates, just add the note
      preview = messageText;
      
      if (noteText.trim()) {
        preview += "\n\n📝 Note: " + noteText;
      }
    }
    
    // Add recipient information for the preview
    preview = `To: ${teacherName}\n\n${preview}`;
    
    return preview;
  };

  const handleSendSms = async () => {
    if (selectedTeachers.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one teacher to send the message to.",
        variant: "destructive"
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create SMS history entry to store
      const smsHistoryEntries = selectedTeachers.map(teacherId => {
        const teacher = teachers.find((t: any) => t.id.toString() === teacherId);
        const teacherName = teacher ? teacher.name : "Unknown";
        
        // Create message with note if present
        let finalMessage = messageText;
        if (noteText.trim()) {
          finalMessage += "\n\n📝 Note: " + noteText;
        }
        
        return {
          id: Date.now() + parseInt(teacherId), // Simple unique ID
          teacherId: parseInt(teacherId),
          teacherName,
          message: finalMessage,
          sentAt: new Date().toISOString(),
          status: "sent"
        };
      });

      // Store SMS history in localStorage for now (would be API call in production)
      const existingHistory = localStorage.getItem('smsHistory') 
        ? JSON.parse(localStorage.getItem('smsHistory')!) 
        : [];
      
      const updatedHistory = [...existingHistory, ...smsHistoryEntries];
      localStorage.setItem('smsHistory', JSON.stringify(updatedHistory));
      
      // Display success message
      toast({
        title: "SMS Sent",
        description: `Message sent to ${selectedTeachers.length} recipients and saved to history.`,
      });
      
      // Reset form
      setSelectedTeachers([]);
      setMessageText("");
      setNoteText("");
      setSelectedTemplate("");
      setStep("select");
      
    } catch (error) {
      toast({
        title: "Failed to send SMS",
        description: "There was an error sending your message.",
        variant: "destructive"
      });
    }
  };

  const renderTeacherOption = (teacher: any) => (
    <div className="flex items-center justify-between w-full">
      <span>{teacher.name}</span>
      <Badge 
        variant={selectedTeachers.includes(teacher.id.toString()) ? "default" : "outline"}
        className="ml-2"
      >
        {selectedTeachers.includes(teacher.id.toString()) ? "Selected" : "Select"}
      </Badge>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SMS Messaging</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            disabled={selectedTeachers.length === 0}
          >
            <X className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </div>
      </div>

      {step === "select" && (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Select Recipients</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">
                Selected: <Badge variant="secondary">{selectedTeachers.length}</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
              >
                <RefreshCcw className="h-4 w-4 mr-1" /> Select All
              </Button>
            </div>
            
            <Tabs defaultValue="meeting">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="meeting">Teacher Meeting</TabsTrigger>
                <TabsTrigger value="assigned">Assigned Teachers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="meeting" className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Quick Select Teachers</h3>
                  <Select onValueChange={handleDropdownTeacherSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassigned && unassigned.map((teacher: any) => (
                        <SelectItem 
                          key={teacher.id} 
                          value={teacher.id.toString()}
                        >
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Accordion type="single" collapsible>
                  <AccordionItem value="all-teachers">
                    <AccordionTrigger>All Teachers</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-2 max-h-80 overflow-y-auto p-2">
                        {unassigned && unassigned.map((teacher: any) => (
                          <div
                            key={teacher.id}
                            className={`p-3 rounded-md cursor-pointer border flex justify-between items-center ${
                              selectedTeachers.includes(teacher.id.toString())
                                ? "bg-primary/10 border-primary"
                                : "bg-card hover:bg-muted/30"
                            }`}
                            onClick={() => toggleTeacherSelection(teacher.id.toString())}
                          >
                            <span>{teacher.name}</span>
                            <Badge variant={selectedTeachers.includes(teacher.id.toString()) ? "default" : "outline"}>
                              {selectedTeachers.includes(teacher.id.toString()) ? "Selected" : "Select"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
              
              <TabsContent value="assigned" className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Quick Select Assigned Teachers</h3>
                  <Select onValueChange={handleDropdownTeacherSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigned && assigned.map((teacher: any) => (
                        <SelectItem 
                          key={teacher.id} 
                          value={teacher.id.toString()}
                        >
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2 max-h-80 overflow-y-auto p-2">
                  {assigned && assigned.map((teacher: any) => (
                    <div
                      key={teacher.id}
                      className={`p-3 rounded-md cursor-pointer border flex justify-between items-center ${
                        selectedTeachers.includes(teacher.id.toString())
                          ? "bg-primary/10 border-primary"
                          : "bg-card hover:bg-muted/30"
                      }`}
                      onClick={() => toggleTeacherSelection(teacher.id.toString())}
                    >
                      <span>{teacher.name}</span>
                      <Badge variant={selectedTeachers.includes(teacher.id.toString()) ? "default" : "outline"}>
                        {selectedTeachers.includes(teacher.id.toString()) ? "Selected" : "Select"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              disabled={selectedTeachers.length === 0}
              onClick={() => setStep("compose")}
            >
              Next: Compose Message
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "compose" && (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span>Compose Message</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                Recipients: <Badge variant="secondary">{selectedTeachers.length}</Badge>
              </p>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select Message Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment Notification</SelectItem>
                  <SelectItem value="reminder">Class Reminder</SelectItem>
                  <SelectItem value="meeting">Staff Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Text</label>
              <Textarea
                placeholder="Message content will appear here based on selected template..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Note (Optional)</label>
              <Textarea
                placeholder="Add a personal note to be included with the message..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-between pt-2 text-xs text-muted-foreground">
              <p>
                {messageText.length} characters
              </p>
              <p>
                {Math.ceil(messageText.length / 160)} SMS
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep("select")}
            >
              Back to Selection
            </Button>
            <Button
              onClick={() => setStep("preview")}
              disabled={!messageText.trim()}
            >
              Preview Message
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "preview" && (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              <span>Message Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h3 className="font-medium mb-2">Recipients</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {getSelectedTeacherNames().map((name, i) => (
                  <Badge key={i} variant="secondary">{name}</Badge>
                ))}
              </div>
              
              <h3 className="font-medium mb-2">SMS Preview</h3>
              <div className="bg-card p-4 rounded-lg border max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {generatePreviewSMS()}
                </pre>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setStep("compose")}
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleSendSms}
            >
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

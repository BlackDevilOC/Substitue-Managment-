
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Send, RefreshCcw, X } from "lucide-react";

export default function SmsSendPage() {
  const { toast } = useToast();
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  
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

  const handleSendMessage = async () => {
    if (selectedTeachers.length === 0) {
      toast.error("Please select at least one teacher");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      // Here would be the API call to send SMS
      // For now, we'll just simulate success
      toast.success(`Message sent to ${selectedTeachers.length} teachers!`);
      setMessageText("");
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  const handleSelectTeacher = (teacherName: string) => {
    if (selectedTeachers.includes(teacherName)) {
      setSelectedTeachers(selectedTeachers.filter(name => name !== teacherName));
    } else {
      setSelectedTeachers([...selectedTeachers, teacherName]);
    }
  };

  const handleSelectAll = () => {
    if (teachers) {
      const allTeacherNames = teachers.map((teacher: any) => teacher.name);
      setSelectedTeachers(allTeacherNames);
    }
  };

  const handleClearAll = () => {
    setSelectedTeachers([]);
  };

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
      // API call would go here
      toast({
        title: "SMS Sent",
        description: `Message sent to ${selectedTeachers.length} recipients.`,
      });
    } catch (error) {
      toast({
        title: "Failed to send SMS",
        description: "There was an error sending your message.",
        variant: "destructive"
      });
    }
  };

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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Select All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Recipients ({selectedTeachers.length})</h3>
              <div className="flex flex-wrap gap-2 min-h-10 p-2 border rounded-md bg-secondary/20">
                {selectedTeachers.map(teacher => (
                  <Badge key={teacher} variant="secondary" className="flex items-center gap-1">
                    {teacher}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleSelectTeacher(teacher)}
                    />
                  </Badge>
                ))}
                {selectedTeachers.length === 0 && (
                  <span className="text-sm text-muted-foreground">No teachers selected</span>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Message</h3>
              <Textarea 
                placeholder="Type your message here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-32"
              />
            </div>
            
            <Button 
              className="w-full"
              onClick={handleSendMessage}
              disabled={selectedTeachers.length === 0 || !messageText.trim()}
            >
              <Send className="mr-2 h-4 w-4" /> Send Message
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Teachers</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4 mt-4">
          {teachersLoading ? (
            <div className="text-center p-4">Loading teachers...</div>
          ) : (
            teachers?.map((teacher: any) => (
              <TeacherCard 
                key={teacher.id}
                teacher={teacher}
                isSelected={selectedTeachers.includes(teacher.name)}
                onSelect={() => handleSelectTeacher(teacher.name)}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="assigned" className="space-y-4 mt-4">
          {assignmentsLoading || teachersLoading ? (
            <div className="text-center p-4">Loading...</div>
          ) : assigned.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No assigned teachers</div>
          ) : (
            assigned.map((teacher: any) => (
              <TeacherCard 
                key={teacher.id}
                teacher={teacher}
                isSelected={selectedTeachers.includes(teacher.name)}
                onSelect={() => handleSelectTeacher(teacher.name)}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="unassigned" className="space-y-4 mt-4">
          {assignmentsLoading || teachersLoading ? (
            <div className="text-center p-4">Loading...</div>
          ) : unassigned.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No unassigned teachers</div>
          ) : (
            unassigned.map((teacher: any) => (
              <TeacherCard 
                key={teacher.id}
                teacher={teacher}
                isSelected={selectedTeachers.includes(teacher.name)}
                onSelect={() => handleSelectTeacher(teacher.name)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeacherCard({ teacher, isSelected, onSelect }: any) {
  return (
    <Card className={`transition-colors ${isSelected ? 'border-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">{teacher.name}</h3>
            <p className="text-sm text-muted-foreground">{teacher.phoneNumber || 'No phone number'}</p>
          </div>
          <Button
            variant={isSelected ? "default" : "outline"} 
            size="sm"
            onClick={onSelect}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

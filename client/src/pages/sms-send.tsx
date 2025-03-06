
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

      <Tabs defaultValue="assigned">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assigned">
            Assigned Teachers
            {assigned.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {assigned.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned Teachers
            {unassigned.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unassigned.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assigned" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Substitute Teachers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignmentsLoading ? (
                <p>Loading...</p>
              ) : assigned.length === 0 ? (
                <p className="text-muted-foreground">No assigned teachers found</p>
              ) : (
                <div className="space-y-2">
                  {assigned.map((teacher: any) => (
                    <div
                      key={teacher.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedTeachers.includes(teacher.id.toString())
                          ? "bg-primary/10 border-primary"
                          : ""
                      }`}
                      onClick={() => {
                        if (selectedTeachers.includes(teacher.id.toString())) {
                          setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id.toString()));
                        } else {
                          setSelectedTeachers([...selectedTeachers, teacher.id.toString()]);
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium">{teacher.name}</p>
                        <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                      </div>
                      <div className="h-5 w-5 rounded-full border flex items-center justify-center">
                        {selectedTeachers.includes(teacher.id.toString()) && (
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="unassigned" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unassigned Substitute Teachers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teachersLoading ? (
                <p>Loading...</p>
              ) : unassigned.length === 0 ? (
                <p className="text-muted-foreground">No unassigned teachers found</p>
              ) : (
                <div className="space-y-2">
                  {unassigned.map((teacher: any) => (
                    <div
                      key={teacher.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedTeachers.includes(teacher.id.toString())
                          ? "bg-primary/10 border-primary"
                          : ""
                      }`}
                      onClick={() => {
                        if (selectedTeachers.includes(teacher.id.toString())) {
                          setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id.toString()));
                        } else {
                          setSelectedTeachers([...selectedTeachers, teacher.id.toString()]);
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium">{teacher.name}</p>
                        <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                      </div>
                      <div className="h-5 w-5 rounded-full border flex items-center justify-center">
                        {selectedTeachers.includes(teacher.id.toString()) && (
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm font-medium">Selected Recipients: {selectedTeachers.length}</p>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Message Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment Notification</SelectItem>
                    <SelectItem value="reminder">Class Reminder</SelectItem>
                    <SelectItem value="meeting">Staff Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Type your message here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {messageText.length} characters
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil(messageText.length / 160)} SMS
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={handleSendSms}>
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Send, RefreshCcw, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const messageTemplates = {
  assignment: [
    {
      title: "Assignment Confirmation",
      text: "Dear {teacher}, you have been assigned to cover {class} for {original_teacher}. Please confirm your availability.",
    },
    {
      title: "Schedule Change",
      text: "Important: Your teaching schedule has been updated. You will be covering {class} during period {period}.",
    },
    {
      title: "Urgent Coverage",
      text: "Urgent: We need coverage for {class}. Please respond ASAP if you're available.",
    },
  ],
  meeting: [
    {
      title: "Regular Staff Meeting",
      text: "Reminder: Staff meeting tomorrow at {time} in {location}. Agenda: {agenda}",
    },
    {
      title: "Emergency Meeting",
      text: "Emergency staff meeting called for today at {time}. Your attendance is required.",
    },
    {
      title: "Department Meeting",
      text: "Department meeting scheduled for {date} at {time}. Please prepare {preparation}.",
    },
  ],
  reminder: [
    {
      title: "Class Schedule",
      text: "Reminder: You have {class} scheduled for {period} period tomorrow.",
    },
    {
      title: "Exam Duty",
      text: "You have been assigned exam duty for {class} on {date} during {period} period.",
    },
    {
      title: "Training Session",
      text: "Training session scheduled for {date} at {time}. Topic: {topic}",
    },
  ],
};

export default function SmsSendPage() {
  const { toast } = useToast();
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [templateCategory, setTemplateCategory] = useState("assignment");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) throw new Error("Failed to fetch teachers");
      return response.json();
    },
  });

  const { data: assignedTeachers, isLoading: assignedLoading } = useQuery({
    queryKey: ["assignedTeachers"],
    queryFn: async () => {
      const response = await fetch("/api/substitute-assignments");
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
  });

  const filteredTeachers = () => {
    if (!teachers || !assignedTeachers?.assignments) return [];

    const assignedIds = assignedTeachers.assignments.map((a: any) =>
      teachers.find((t: any) => t.name === a.substitute)?.id
    ).filter(Boolean);

    switch (teacherFilter) {
      case "assigned":
        return teachers.filter((t: any) => assignedIds.includes(t.id));
      case "unassigned":
        return teachers.filter((t: any) => !assignedIds.includes(t.id));
      default:
        return teachers;
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template.title);
    setMessageText(template.text);
  };

  const handleSendSms = async () => {
    if (selectedTeachers.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one teacher to send the message to.",
        variant: "destructive",
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Combine message with note if present
      const finalMessage = noteText
        ? `${messageText}\n\nNote: ${noteText}`
        : messageText;

      toast({
        title: "SMS Sent",
        description: `Message sent to ${selectedTeachers.length} recipients.`,
      });
    } catch (error) {
      toast({
        title: "Failed to send SMS",
        description: "There was an error sending your message.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <h1 className="text-2xl font-bold">SMS Messaging</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTeachers([])}
            disabled={selectedTeachers.length === 0}
          >
            <X className="h-4 w-4 mr-1" /> Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedTeachers(teachers?.map((t: any) => t.id.toString()) || [])
            }
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Select All
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter teachers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                <SelectItem value="assigned">Assigned Teachers</SelectItem>
                <SelectItem value="unassigned">Unassigned Teachers</SelectItem>
              </SelectContent>
            </Select>

            <motion.div layout className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {filteredTeachers().map((teacher: any) => (
                  <motion.div
                    key={teacher.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTeachers.includes(teacher.id.toString())
                        ? "bg-primary/10 border-primary"
                        : ""
                    }`}
                    onClick={() => {
                      if (selectedTeachers.includes(teacher.id.toString())) {
                        setSelectedTeachers(selectedTeachers.filter((id) => id !== teacher.id.toString()));
                      } else {
                        setSelectedTeachers([...selectedTeachers, teacher.id.toString()]);
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                    </div>
                    <motion.div
                      className="h-5 w-5 rounded-full border flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      {selectedTeachers.includes(teacher.id.toString()) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="h-3 w-3 rounded-full bg-primary"
                        />
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-sm font-medium">Selected Recipients: {selectedTeachers.length}</p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Message Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignment">Assignment Notifications</SelectItem>
                    <SelectItem value="meeting">Staff Meetings</SelectItem>
                    <SelectItem value="reminder">Class Reminders</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTemplate}
                  onValueChange={(value) => {
                    const template = messageTemplates[templateCategory as keyof typeof messageTemplates].find(
                      (t) => t.title === value
                    );
                    if (template) handleTemplateSelect(template);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Select Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {messageTemplates[templateCategory as keyof typeof messageTemplates].map((template) => (
                      <SelectItem key={template.title} value={template.title}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[120px]"
            />

            <div className="space-y-2">
              <Label>Additional Note (Optional)</Label>
              <Textarea
                placeholder="Add a note that will appear at the bottom of your message..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {messageText.length + (noteText ? noteText.length + 2 : 0)} characters
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.ceil((messageText.length + (noteText ? noteText.length + 2 : 0)) / 160)} SMS
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSendSms}
              disabled={selectedTeachers.length === 0 || !messageText.trim()}
            >
              <Send className="h-4 w-4 mr-2" /> Send Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
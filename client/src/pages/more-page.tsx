import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Settings, 
  Users, 
  BookOpen, 
  Calendar, 
  Bell, 
  FileText, 
  MessageSquare, 
  HelpCircle,
  Beaker,
  Upload,
  Clock
} from "lucide-react";

const menuItems = [
    {
      title: "Schedule",
      icon: <Calendar className="h-6 w-6" />,
      path: "/schedule",
      color: "bg-blue-100",
      description: "View and manage daily schedules"
    },
    {
      title: "Period Times",
      icon: <Clock className="h-6 w-6" />,
      path: "/periods",
      color: "bg-green-100",
      description: "Configure period start and end times"
    },
    {
      title: "File Upload",
      icon: <Upload className="h-6 w-6" />,
      path: "/file-upload",
      color: "bg-purple-100",
      description: "Upload timetable and schedule files"
    },
    {
      title: "SMS History",
      icon: <MessageSquare className="h-6 w-6" />,
      path: "/sms-history",
      color: "bg-yellow-100",
      description: "View message history and notifications"
    },
    {
      title: "Teachers",
      icon: <Users className="h-6 w-6" />,
      path: "/teachers",
      color: "bg-red-100",
      description: "Manage teacher information"
    },
    {
      title: "Notifications",
      icon: <Bell className="h-6 w-6" />,
      path: "/notifications",
      color: "bg-indigo-100",
      description: "Manage notification preferences"
    },
    {
      title: "Experiments",
      icon: <Beaker className="h-6 w-6" />,
      path: "/experiments",
      color: "bg-teal-100",
      description: "Test new features and configurations"
    },
    {
      title: "Help",
      icon: <HelpCircle className="h-6 w-6" />,
      path: "/help",
      color: "bg-gray-100",
      description: "Get help and documentation"
    },
    {
      title: "Settings",
      icon: <Settings className="h-6 w-6" />,
      path: "/settings",
      color: "bg-orange-100",
      description: "Configure system preferences"
    }
  ];

function MorePage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">Settings & More</h1>
      <p className="text-gray-500 mb-6">Manage your school system preferences and access additional features</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item, index) => (
          <Link to={item.path} key={index}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${item.color} p-2 rounded-lg`}>
                    {item.icon}
                  </div>
                  <span className="font-medium text-lg">{item.title}</span>
                </div>
                {item.description && (
                  <p className="text-gray-500 text-sm ml-12">{item.description}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default MorePage;
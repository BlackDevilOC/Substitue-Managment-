import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Calendar, Clock, FileUp, Settings, FileDown } from "lucide-react";

function MorePage() {
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
      color: "bg-purple-100",
      description: "Configure period start and end times"
    },
    {
      title: "File Upload",
      icon: <FileUp className="h-6 w-6" />,
      path: "/upload",
      color: "bg-green-100",
      description: "Upload timetable and substitute files"
    },
    {
      title: "Migration",
      icon: <FileDown className="h-6 w-6" />,
      path: "/migration",
      color: "bg-yellow-100",
      description: "Export or import your settings"
    },
    {
      title: "Statistics",
      icon: <BarChart3 className="h-6 w-6" />,
      path: "/statistics",
      color: "bg-pink-100",
      description: "View system statistics and reports"
    },
    {
      title: "Settings",
      icon: <Settings className="h-6 w-6" />,
      path: "/settings",
      color: "bg-orange-100",
      description: "Configure system preferences"
    }
  ];

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">Settings & More</h1>
      <p className="text-gray-500 mb-6">Manage your school system preferences and access additional features</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
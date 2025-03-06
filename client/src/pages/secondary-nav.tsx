import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  MessageSquare, 
  Settings,
  Calendar,
  Clock,
  Upload,
  FileText,
  Users,
  School,
  Beaker
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function SecondaryNavPage() {
  const navItems = [
    {
      title: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      href: "/schedule",
      description: "View and manage daily schedules"
    },
    {
      title: "Period Times",
      icon: <Clock className="h-5 w-5" />,
      href: "/periods",
      description: "Configure period start and end times"
    },
    {
      title: "File Upload",
      icon: <Upload className="h-5 w-5" />,
      href: "/file-upload",
      description: "Upload timetable and schedule files"
    },
    {
      title: "SMS History",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/sms-history",
      description: "View message history and notifications"
    },
    {
      title: "Substitutes",
      icon: <Users className="h-5 w-5" />,
      href: "/substitutes-page",
      description: "Manage substitute teachers"
    },
    {
      title: "Notifications",
      icon: <Bell className="h-5 w-5" />,
      href: "/notifications",
      description: "Manage notification preferences"
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
      description: "Configure system preferences"
    },
    {
      title: "Teacher Details",
      icon: <School className="h-5 w-5" />,
      href: "/teacher-details",
      description: "View and manage teacher information"
    },
    {
      title: "Experiments",
      icon: <Beaker className="h-5 w-5" />,
      href: "/experiments",
      description: "Test and validate code changes"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-background to-background/80">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-primary">Settings & More</h1>
        <p className="text-muted-foreground mt-2">Manage your school system preferences and access additional features</p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {navItems.map((item) => (
          <motion.div
            key={item.href}
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href={item.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
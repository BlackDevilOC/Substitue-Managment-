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
  Beaker,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cn } from "@/lib/utils";

export default function SecondaryNavPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const navCategories = [
    {
      name: "Schedule Management",
      items: [
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
          href: "/upload",
          description: "Upload timetable and schedule files"
        }
      ]
    },
    {
      name: "Communication",
      items: [
        {
          title: "SMS Send",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/sms-send",
          description: "Send SMS messages to teachers"
        },
        {
          title: "SMS History",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/sms-history",
          description: "View message history and notifications"
        },
        {
          title: "Notifications",
          icon: <Bell className="h-5 w-5" />,
          href: "/notifications",
          description: "Manage notification preferences"
        }
      ]
    },
    {
      name: "Staff Management",
      items: [
        {
          title: "Substitutes",
          icon: <Users className="h-5 w-5" />,
          href: "/assigned-substitutes",
          description: "Manage substitute teachers"
        },
        {
          title: "Teacher Details",
          icon: <School className="h-5 w-5" />,
          href: "/teacher-details",
          description: "View and manage teacher information"
        }
      ]
    },
    {
      name: "System",
      items: [
        {
          title: "Settings",
          icon: <Settings className="h-5 w-5" />,
          href: "/settings",
          description: "Configure system preferences"
        },
        {
          title: "Experiments",
          icon: <Beaker className="h-5 w-5" />,
          href: "/experiments",
          description: "Test and validate code changes"
        }
      ]
    }
  ];

  const toggleCategory = (name: string) => {
    setActiveCategory(activeCategory === name ? null : name);
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

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {navCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => toggleCategory(category.name)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border-2",
                activeCategory === category.name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {navCategories.map((category) => (
            activeCategory === category.name && (
              <motion.div 
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ staggerChildren: 0.1 }}
                className="space-y-4"
              >
                {category.items.map((item) => (
                  <motion.div
                    key={item.href}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-card rounded-lg shadow p-4 border border-border hover:border-primary/50 transition-all"
                  >
                    <Link href={item.href}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {item.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )
          ))}
        </motion.div>

        {!activeCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-card rounded-lg shadow border border-border text-center"
          >
            <p className="text-muted-foreground">Select a category to view available options</p>
          </motion.div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
        <div className="flex flex-wrap gap-3">
          {navCategories.flatMap(category => 
            category.items.map(item => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary"
                >
                  <div className="text-primary">{item.icon}</div>
                  <span className="text-sm font-medium">{item.title}</span>
                </motion.div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
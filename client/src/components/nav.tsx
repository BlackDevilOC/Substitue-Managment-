import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { FileBarChart, Users, Calendar, Send, FileCheck2, FileText, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Nav() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-2 flex items-center space-x-2">
            <span className="font-bold">Absent Teachers</span>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button asChild variant={isActive("/") ? "default" : "ghost"} size="sm">
            <Link to="/">
              <Users className="mr-2 h-4 w-4" />
              Teachers
            </Link>
          </Button>
          <Button asChild variant={isActive("/schedule") ? "default" : "ghost"} size="sm">
            <Link to="/schedule">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Link>
          </Button>
          <Button asChild variant={isActive("/attendance") ? "default" : "ghost"} size="sm">
            <Link to="/attendance">
              <FileCheck2 className="mr-2 h-4 w-4" />
              Attendance
            </Link>
          </Button>
          <Button asChild variant={isActive("/sms") ? "default" : "ghost"} size="sm">
            <Link to="/sms">
              <Send className="mr-2 h-4 w-4" />
              SMS
            </Link>
          </Button>
          <Button asChild variant={isActive("/reports") ? "default" : "ghost"} size="sm">
            <Link to="/reports">
              <FileBarChart className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
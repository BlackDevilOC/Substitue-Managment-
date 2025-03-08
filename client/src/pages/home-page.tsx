import { Link } from "wouter";
import {
  Bell,
  Calendar,
  Clock,
  Home,
  Users,
  MessageSquare,
  BookOpen,
  MoreHorizontal,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PeriodStatusWidget } from "@/components/period-status-widget";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/testing">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="bg-card rounded-lg p-4 shadow-sm border">
            <PeriodStatusWidget />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <div className="bg-card rounded-lg p-4 shadow-sm border h-full">
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link href="/substitutes">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Substitutes</span>
                </Button>
              </Link>
              <Link href="/calendar">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Calendar</span>
                </Button>
              </Link>
              <Link href="/notifications">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Bell className="h-5 w-5" />
                  <span className="text-xs">Notifications</span>
                </Button>
              </Link>
              <Link href="/periods">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Clock className="h-5 w-5" />
                  <span className="text-xs">Periods</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {user?.isAdmin && (
        <div className="mt-4 bg-card rounded-lg p-4 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Admin Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link href="/experiments">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">Experiments</span>
              </Button>
            </Link>
            <Link href="/sms-send">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Send SMS</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <Home className="h-5 w-5" />
                <span className="text-xs">Profile</span>
              </Button>
            </Link>
            <Link href="/more">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs">More</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
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
  Settings,
  Search,
  FileUp,
  BarChart3,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PeriodStatusWidget } from "@/components/period-status-widget";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4">
      {/* Logo Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 relative mb-2">
          <img 
            src="/schedulizer-logo.png"
            alt="Schedulizer Logo"
            className="w-full h-full object-contain"
            loading="eager"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = "/icons/icon-192x192.png"; // Fallback to icon if main logo fails
            }}
          />
        </div>
        <h2 className="text-lg font-medium text-muted-foreground text-center">
          Stay Organized, Stay Ahead!
        </h2>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="bg-card rounded-lg p-4 shadow-sm border">
            <PeriodStatusWidget />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <div className="bg-card rounded-lg p-4 shadow-sm border h-full">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link href="/manage-absences">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-xs">Manage Absences</span>
                </Button>
              </Link>
              <Link href="/assigned-substitutes">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Substitutes</span>
                </Button>
              </Link>
              <Link href="/schedule">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Schedule</span>
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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Communication</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/sms-send">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Send SMS</span>
              </Button>
            </Link>
            <Link href="/sms-history">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">SMS History</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Tools</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/upload">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <FileUp className="h-5 w-5" />
                <span className="text-xs">File Upload</span>
              </Button>
            </Link>
            <Link href="/lookup">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1">
                <Search className="h-5 w-5" />
                <span className="text-xs">Lookup</span>
              </Button>
            </Link>
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
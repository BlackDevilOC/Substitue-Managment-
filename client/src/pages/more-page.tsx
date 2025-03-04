
import React from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarClock, Users, FileSpreadsheet, Settings, BookOpen, Calendar } from "lucide-react";

export default function MorePage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">More Options</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/teachers">
          <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Teacher Management</CardTitle>
              <CardDescription>Add, edit, or remove teachers</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/timetable">
          <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CalendarClock className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Timetable Management</CardTitle>
              <CardDescription>Manage class schedules and periods</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/absence-page">
          <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <Calendar className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Absence Page</CardTitle>
              <CardDescription>Manage teacher absences</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/manage-absences">
          <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <BookOpen className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Absence Management</CardTitle>
              <CardDescription>Manage teacher absences and substitutes</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        
        <Link href="/reports">
          <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <FileSpreadsheet className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate and view attendance reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

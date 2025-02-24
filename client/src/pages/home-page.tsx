import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const isLoading = loadingAbsences || loadingTeachers;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">View and manage daily schedules</p>
              <Link href="/schedule">
                <Button className="w-full mt-4">View Schedule</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Absent Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{absences?.length || 0}</p>
              <p className="text-muted-foreground">teachers marked absent today</p>
              <Link href="/absences">
                <Button className="w-full mt-4">Manage Absences</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Substitute Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {teachers?.filter(t => t.isSubstitute)?.length || 0}
              </p>
              <p className="text-muted-foreground">available substitutes</p>
              <Link href="/substitutes">
                <Button className="w-full mt-4">View Substitutes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

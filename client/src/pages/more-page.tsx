import { Link } from "wouter";
import { FileText, RefreshCcw, Calendar, UserX } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui/card";
import { ExportToExcelButton } from "@/components/ui/buttons";

const MorePage = () => {
  return (
    <div className="space-y-4">
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Import your data from a CSV or Excel file.
          </p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCcw className="w-5 h-5 mr-2" />
            Refresh Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Refresh your data to get the latest updates.
          </p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Calendar View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            View your data in a calendar format.
          </p>
        </CardContent>
      </Card>


      <ExportToExcelButton />

      <Link href="/absence">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserX className="w-5 h-5 mr-2" />
              Absence Experiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Test the experimental absence management interface.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default MorePage;
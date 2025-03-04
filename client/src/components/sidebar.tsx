import { Home, Users, CalendarClock, FileSpreadsheet, Settings, MoreHorizontal } from "lucide-react";

// ... (rest of the imports) ...

// ... (rest of the code) ...


function Navigation() {
  return (
    <nav>
      <NavLink to="/" icon={Home}>
        Home
      </NavLink>
      <NavLink to="/users" icon={Users}>
        Users
      </NavLink>
      <NavLink to="/calendar" icon={CalendarClock}>
        Calendar
      </NavLink>
      <NavLink to="/reports" icon={FileSpreadsheet}>
        Reports
      </NavLink>
      <NavLink to="/setup" icon={Settings}>
        Setup
      </NavLink>
      <NavLink to="/more" icon={MoreHorizontal}>
        More
      </NavLink>
    </nav>
  );
}

// ... (rest of the code) ...
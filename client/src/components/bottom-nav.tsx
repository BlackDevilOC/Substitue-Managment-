import { Home, Calendar, UserMinus, UserCheck, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function BottomNav() {
  const [location] = useLocation();

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: UserMinus, label: "Absences", href: "/manage-absences" },
    { icon: UserCheck, label: "Substitutes", href: "/substitutes" },
    { icon: MoreHorizontal, label: "More", href: "/more" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t h-16">
      <div className="grid grid-cols-4 h-full max-w-md mx-auto">
        {items.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center ${
              location === href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminTopBarProps {
  admin: {
    name: string;
    email: string;
    role: string;
  };
}

export function AdminTopBar({ admin }: AdminTopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const initials = admin.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleColors: Record<string, string> = {
    super_admin: "bg-red-500",
    admin: "bg-blue-500",
    moderator: "bg-green-500",
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-end px-6">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-foreground">{admin.name}</span>
              <Badge
                variant="secondary"
                className={`${roleColors[admin.role] || "bg-muted"} text-white text-xs`}
              >
                {admin.role.replace("_", " ")}
              </Badge>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{admin.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {admin.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
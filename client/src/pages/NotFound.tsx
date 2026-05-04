import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <p className="text-xl font-semibold mb-2">Page Not Found</p>
      <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
      <Link href="/dashboard">
        <a><Button>Go to Dashboard</Button></a>
      </Link>
    </div>
  );
}

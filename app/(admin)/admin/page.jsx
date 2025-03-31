import { getDashboardData } from "@/actions/admin";
import React from "react";
import Dashboard from "./_components/dashboard";

export const metadata = {
  title: "Dashboard | Vahaan Admin",
  description: "Admin Dashboard for Vahaan marketplace",
};

const AdminPage = async () => {
  const dashboardData = await getDashboardData();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Dashboard initialData={dashboardData} />
    </div>
  );
};

export default AdminPage;

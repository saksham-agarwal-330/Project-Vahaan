import React from "react";
import TestDriveList from "./_components/test-drive-list";

export const metaData = {
  title: "Test Drives | Vahaan Admin",
  description: "Manage test drive bookings",
};

const TestDrivePage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Test drive Management</h1>
      <TestDriveList  />
    </div>
  );
};

export default TestDrivePage;

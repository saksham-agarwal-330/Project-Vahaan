import { getCarById } from "@/actions/car-listing";
import { notFound } from "next/navigation";
import React from "react";
import TestDriveForm from "./_components/test-drive-form";

export async function generateMetadata() {
  return {
    title: "Book Test Drive | Vahaan",
    description: "Book a test drive for your dream car at Vahaan.",
  };
}

const TestDrivepage = async ({ params }) => {
  const { id } = params;
  const result = await getCarById(id);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl mb-6 gradient-title">Book a Test Drive</h1>

      <TestDriveForm
        car={result.data}
        testDriveInfo={result.data.testDriveInfo}
      />
    </div>
  );
};

export default TestDrivepage;

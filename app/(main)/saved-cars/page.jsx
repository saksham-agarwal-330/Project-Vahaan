import { getSavedCars } from "@/actions/car-listing";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import SavedCarsList from "./_components/saved-cars-list";

export const metadata = {
  title: "Saved Cars | Vahaan",
  description: "View your saved cars and favorites",
};

const SavedCarsPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect=/saved-cars");
  }

  // Fetch saved cars from the database
  const SavedCarsResult = await getSavedCars(userId);
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl gradient-title mb-4">Your Saved Cars</h1>
      <SavedCarsList initialData={SavedCarsResult} />
    </div>
  );
};

export default SavedCarsPage;

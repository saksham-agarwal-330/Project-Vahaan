"use server";

import { serializedCarData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function bookTestDrive({
    carId,
    bookingDate,
    startTime,
    endTime,
    notes,
}) {
    try {
        const { userId } = await auth()
        if (!userId) throw new Error("You must be logged in to book a test drive");

        // Find user in our database
        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) throw new Error("User not found in database");

        // check if the car is available
        const car = await db.car.findUnique({
            where: { id: carId, status: "AVAILABLE" },
        });

        if (!car) throw new Error("Car not available for test drive");

        // check if the booking time is available
        const existingBooking = await db.testDriveBooking.findFirst({
            where: {
                carId: carId,
                bookingDate: new Date(bookingDate),
                startTime,
                status: { in: ["PENDING", "CONFIRMED"] },
            },
        });

        if (existingBooking) throw new Error("This time slot is already booked. Please choose another time slot.");

        // Create a new test drive booking
        const booking = await db.testDriveBooking.create({
            data: {
                carId,
                userId: user.id,
                bookingDate: new Date(bookingDate),
                startTime,
                endTime,
                notes: notes || null,
                status: "PENDING",
            },
        });

        revalidatePath(`/test-drive/${carId}`)
        revalidatePath(`/cars/${carId}`)

        return {
            success: true,
            data: booking,
        }
    } catch (error) {
        console.error("Error booking test drive", error);
        return {
            success: false,
            error: error.message || "Failed to book test drive",
        };
    }
}

export async function getUserTestDrives() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return {
                success: false,
                error: "You must be logged in to view your test drives",
            };
        }

        // Get the user from our database
        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            return {
                success: false,
                error: "User not found",
            };
        }

        // Get the user's test drive bookings
        const bookings = await db.testDriveBooking.findMany({
            where: { userId: user.id },
            include: {
                car: true, // Include car details if needed
            },
            orderBy: {
                bookingDate: "desc",
            },
        });

        // Format the bookings
        const formattedBookings = bookings.map((booking) => ({
            id: booking.id,
            carId: booking.carId,
            car: serializedCarData(booking.car),
            bookingDate: booking.bookingDate.toISOString(),
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            notes: booking.notes,
            createdAt: booking.createdAt.toISOString(),
            updatedAt: booking.updatedAt.toISOString(),
        }));

        return {
            success: true,
            data: formattedBookings,
        };

    } catch (error) {
        console.error("Error fetching user test drives", error);
        return {
            success: false,
            error: error.message || "Failed to fetch user test drives",
        };
    }
}

export async function cancelTestDrive(bookingId) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("You must be logged in to cancel a test drive");

        // Find user in our database
        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) throw new Error("User not found in database");

        // Find the booking
        const booking = await db.testDriveBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return {
                success: false,
                error: "Booking not found",
            };
        }

        if (booking.userId !== user.id || user.role !== "ADMIN") {
            return {
                success: false,
                error: "You are not authorized to cancel this booking",
            };
        }

        // check if the booking is already cancelled
        if (booking.status === "CANCELLED") {
            return {
                success: false,
                error: "This booking is already cancelled",
            };
        }

        if (booking.status === "COMPLETED") {
            return {
                success: false,
                error: "This booking is already completed",
            };
        }

        // update the booking status
        await db.testDriveBooking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
        })

        revalidatePath("/reservations")
        revalidatePath("/admin/test-drives")

        return {
            success: true,
            message: "Test drive booking cancelled successfully",
        };

    } catch (error) {
        console.error("Error cancelling test drive", error);
        return {
            success: false,
            error: error.message || "Failed to cancel test drive",
        };

    }
}


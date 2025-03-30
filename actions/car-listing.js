"use server";

import { serializedCarData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getCarFilters() {
    try {
        const makes = await db.car.findMany({
            where: { status: 'AVAILABLE' },
            select: { make: true },
            distinct: ['make'],
            orderBy: { make: 'asc' }
        })

        const bodyTypes = await db.car.findMany({
            where: { status: 'AVAILABLE' },
            select: { bodyType: true },
            distinct: ['bodyType'],
            orderBy: { bodyType: 'asc' }
        })

        const fuetTypes = await db.car.findMany({
            where: { status: 'AVAILABLE' },
            select: { fuelType: true },
            distinct: ['fuelType'],
            orderBy: { fuelType: 'asc' }
        })

        const transmissionTypes = await db.car.findMany({
            where: { status: 'AVAILABLE' },
            select: { transmission: true },
            distinct: ['transmission'],
            orderBy: { transmission: 'asc' }
        })

        // GET MIN AND MAX PRICE
        const priceAggregations = await db.car.aggregate({
            where: { status: "AVAILABLE" },
            _min: { price: true },
            _max: { price: true }
        })

        return {
            success: true,
            data: {
                makes: makes.map((item) => item.make),
                bodyTypes: bodyTypes.map((item) => item.bodyType),
                fuelTypes: fuetTypes.map((item) => item.fuelType),
                transmissions: transmissionTypes.map((item) => item.transmission),
                priceRange: {
                    min: priceAggregations._min.price ? parseFloat(priceAggregations._min.price, toString()) : 0,
                    max: priceAggregations._max.price ? parseFloat(priceAggregations._max.price, toString()) : 1000000,
                }
            }
        }
    } catch (error) {
        throw new Error(`Error fetching car filters: ${error.message}`);
    }
}

export async function getCars({
    search = "", make = "", bodyType = "", fuelType = "", transmission = "", minPrice = 0, maxPrice = Number.MAX_SAFE_INTEGER, limit = 6, page = 1, sortBy = "newest",
}) {
    try {
        const { userId } = await auth()
        let dbUser = null

        if (userId) {
            dbUser = await db.user.findUnique({
                where: { clerkUserId: userId }
            })
        }
        let where = {
            status: "AVAILABLE",
        }

        if (search) {
            where.OR = [
                { make: { contains: search, mode: "insensitive" } },
                { model: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ]
        }

        if (make) {
            where.make = { equals: make, mode: "insensitive" }
        }
        if (bodyType) {
            where.bodyType = { equals: bodyType, mode: "insensitive" }
        }
        if (fuelType) {
            where.fuelType = { equals: fuelType, mode: "insensitive" }
        }
        if (transmission) {
            where.transmission = { equals: transmission, mode: "insensitive" }
        }

        where.price = {
            gte: parseFloat(minPrice) || 0,
        }
        if (maxPrice && maxPrice < Number.MAX_SAFE_INTEGER) {
            where.price.lte = parseFloat(maxPrice)
        }
        const skip = (page - 1) * limit

        // determine sort order
        let orderBy = {}
        switch (sortBy) {
            case "priceAsc":
                orderBy = { price: "asc" }
                break
            case "priceDesc":
                orderBy = { price: "desc" }
                break
            case "newest":
                orderBy = { createdAt: "desc" }
                break
            default:
                orderBy = { createdAt: "desc" }
                break
        }

        const totalCars = await db.car.count({
            where,
        })

        // Execute the query with pagination and sorting
        const cars = await db.car.findMany({
            where,
            orderBy,
            skip,
            take: limit,
        })

        let wishlisted = new Set()
        if (dbUser) {
            const savedCars = await db.userSavedCar.findMany({
                where: {
                    userId: dbUser.id,
                },
                select: {
                    carId: true,
                },
            })
            wishlisted = new Set(savedCars.map((car) => car.carId))
        }
        // Seralize and check wishlist status
        const serializedCars = cars.map((car) =>
            serializedCarData(car, wishlisted.has(car.id))
        )

        return {
            success: true,
            data: serializedCars,
            pagination: {
                total: totalCars,
                page: page,
                limit,
                pages: Math.ceil(totalCars / limit),
            }
        }
    } catch (error) {
        throw new Error(`Error fetching cars: ${error.message}`);

    }
}

export async function toggleSavedCar(carId) {
    try {
        const { userId } = await auth()
        if (!userId) {
            throw new Error("Unauthorized")
        }
        const user = await db.user.findUnique({
            where: { clerkUserId: userId }
        })
        if (!user) {
            throw new Error("User not found")
        }

        // check if car exists
        const car = await db.car.findUnique({
            where: { id: carId },
        })
        if (!car) {
            return {
                success: false,
                error: "Car not found"
            }
        }
        // check if car is already saved
        const savedCar = await db.UserSavedCar.findUnique({
            where: {
                userId_carId: {
                    userId: user.id,
                    carId: carId,
                },
            },
        })
        // if car is already saved, delete it
        if (savedCar) {
            await db.UserSavedCar.delete({
                where: {
                    userId_carId: {
                        userId: user.id,
                        carId: carId,
                    },
                },
            })
            revalidatePath("/saved-cars")
            return {
                success: true,
                saved: false,
                message: "Car removed from favorites",
            }
        } else {
            // if car is not saved, create it
            await db.UserSavedCar.create({
                data: {
                    userId: user.id,
                    carId: carId,
                },
            })
            revalidatePath("/saved-cars")
            return {
                success: true,
                message: "Car added to favorites",
                saved: true,
            }
        }
    } catch (error) {
        throw new Error(`Error toggling saved car: ${error.message}`);

    }
}

export async function getSavedCars() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized",
            }
        }
        const user = await db.user.findUnique({
            where: { clerkUserId: userId }
        })
        if (!user) {
            return {
                success: false,
                error: "User not found",
            }
        }
        // get saved cars
        const savedCars = await db.UserSavedCar.findMany({
            where: {
                userId: user.id,
            },
            include: {
                car: true
            },
            orderBy: {
                "savedAt": "desc"
            }
        })

        const cars = savedCars.map((saved) => serializedCarData(saved.car))
        return {
            success: true,
            data: cars,
        }
    } catch (error) {
        throw new Error(`Error fetching saved cars: ${error.message}`);

    }
}

export async function getCarById(carId) {
    try {
        const { userId } = await auth()
        let dbUser = null
        if (userId) {
            dbUser = await db.user.findUnique({
                where: { clerkUserId: userId }
            })
        }
        const car = await db.car.findUnique({
            where: { id: carId },
        })
        if (!car) {
            return {
                success: false,
                error: "Car not found",
            }
        }
        let isWishlisted = false
        if (dbUser) {
            const savedCar = await db.userSavedCar.findUnique({
                where: {
                    userId_carId: {
                        userId: dbUser.id,
                        carId: carId
                    }
                }
            })
            isWishlisted = !!savedCar
        }

        const existingTestDrive = await db.testDriveBooking.findFirst({
            where: {
                carId,
                userId: dbUser?.id,
                status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        let userTestDrive = null
        if (existingTestDrive) {
            userTestDrive = {
                id: existingTestDrive.id,
                status: existingTestDrive.status,
                bookingDate: existingTestDrive.bookingDate.toISOString(),
            }
        }

        const dealership = await db.dealerShipInfo.findFirst({
            include: {
                workingHours: true,
            }
        })

        return {
            success: true,
            data: {
                ...serializedCarData(car, isWishlisted),
                testDriveInfo: {
                    userTestDrive,
                    dealership: dealership ? {
                        ...dealership,
                        createdAt: dealership.createdAt.toISOString(),
                        updatedAt: dealership.updatedAt.toISOString(),
                        workingHours: dealership.workingHours.map((hour) => ({
                            ...hour,
                            createdAt: hour.createdAt.toISOString(),
                            updatedAt: hour.updatedAt.toISOString(),
                        }))
                    } : null
                }
            }
        }
    } catch (error) {
        throw new Error(`Error fetching car details: ${error.message}`);
    }
}

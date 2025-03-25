"use server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai"
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { v4 as uuid4 } from "uuid";
import { serializedCarData } from "@/lib/helper";

async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

export async function processCarImageWithAi(file) {
  try {
    // check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not available')
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const base64Image = await fileToBase64(file)

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type
      }
    }
    const prompt = `
        Analyze this car image and extract the following information:
        1. Make (manufacturer)
        2. Model
        3. Year (approximately)
        4. Color
        5. Body type (e.g. sedan, SUV, coupe)
        6. Mileage
        7. Fuel type (e.g. gasoline, electric)
        8. Transmission (e.g. automatic, manual)
        9. Price (estimated)
        10. Short Description as to be added to a car listing
        
        Format your response as a clean JSON object with these fields:
        {
            "make":"",
            "model":"",
            "year":"0000",
            "color":"",
            "bodyType":"",
            "mileage":"",
            "fuelType":"",
            "transmission":"",
            "price":"",
            "description":""
            "confidence":0.0
        }
            For confidence, provide a value between 0.0 and 1.0 indicating how confident you are in the extracted information.
            Only respond with the JSON object and nothing else.
        `;

    const result = await model.generateContent([imagePart, prompt])
    const response = await result.response
    const text = response.text()
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const carDetails = JSON.parse(cleanedText);

      const requiredFields = [
        'make',
        'model',
        'year',
        'color',
        'bodyType',
        'mileage',
        'fuelType',
        'transmission',
        'price',
        'description',
        'confidence',
      ]

      const missingFields = requiredFields.filter(field => !(field in carDetails))

      if (missingFields.length > 0) {
        throw new Error(`Missing fields in response: ${missingFields.join(', ')}`)
      }
      return {
        success: true,
        data: carDetails,
      }
    } catch (error) {
      console.error("Failed to parse response as JSON", parseError)
      return {
        success: false,
        error: "Failed to parse response as JSON"
      }
    }
  } catch (error) {
    throw new Error("Failed to process image with AI" + error.message)
  }

}

export async function addCar({ carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Create a unique folder name for this car's images
    const carId = uuid4();
    const folderPath = `cars/${carId}`;

    // Initialize Supabase client for server-side operations
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Upload all images to Supabase storage
    const imageUrls = [];

    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i];

      // Skip if image data is not valid
      if (!base64Data || !base64Data.startsWith("data:image/")) {
        console.warn("Skipping invalid image data");
        continue;
      }

      // Extract the base64 part (remove the data:image/xyz;base64, prefix)
      const base64 = base64Data.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      // Determine file extension from the data URL
      const mimeMatch = base64Data.match(/data:image\/([a-zA-Z0-9]+);/);
      const fileExtension = mimeMatch ? mimeMatch[1] : "jpeg";

      // Create filename
      const fileName = `image-${Date.now()}-${i}.${fileExtension}`;
      const filePath = `${folderPath}/${fileName}`;

      // Upload the file buffer directly
      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`,
        });

      if (error) {
        console.error("Error uploading image:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get the public URL for the uploaded file
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-images/${filePath}`; // disable cache in config

      imageUrls.push(publicUrl);
    }

    if (imageUrls.length === 0) {
      throw new Error("No valid images were uploaded");
    }

    // Add the car to the database
    const car = await db.car.create({
      data: {
        id: carId, // Use the same ID we used for the folder
        make: carData.make,
        model: carData.model,
        year: carData.year,
        price: carData.price,
        mileage: carData.mileage,
        color: carData.color,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        bodyType: carData.bodyType,
        seats: carData.seats,
        description: carData.description,
        status: carData.status,
        featured: carData.featured,
        images: imageUrls, // Store the array of image URLs
      },
    });

    // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    throw new Error("Error adding car:" + error.message);
  }
}

export async function getCars(search = "") {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    let where = {}

    if (search) {
      where.OR = [
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ]
    }

    const cars = await db.car.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    const serializedCars = cars.map(serializedCarData)

    return {
      success: true,
      data: serializedCars
    }
  } catch (error) {
    console.error("Error getting cars:", error);
    return {
      success: false,
      error: error.message
    }
  }
}

export async function deleteCar(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // First find the car to get the images
    const car = await db.car.findUnique({
      where: { id },
      select: { images: true },
    })

    if (!car) {
      return {
        success: false,
        error: "Car not found"
      }
    }

    // Delete the car from the database
    await db.car.delete({
      where: { id },
    });

    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);

      const filePaths = car.images.map(url => {
        const path = new URL(url)
        const pathMatch = path.pathname.match(/\/car-images\/(.*)/)
        return pathMatch ? pathMatch[1] : null
      }).filter(Boolean)

      if (filePaths.length > 0) {
        const { data, error } = await supabase.storage
          .from("car-images")
          .remove(filePaths)

        if (error) {
          console.error("Error deleting car images:", error);
        }
      }
    } catch (storageError) {
      console.error("Error with storage operation:", storageError);
    }

    // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true
    }

  } catch (error) {
    console.error("Error deleting car:", error);
    return {
      success: false,
      error: error.message
    }
  }
}

export async function updateCarStatus(id, { status, featured }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    const updateData = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (featured !== undefined) {
      updateData.featured = featured
    }

    //  Update the car in the database
    const car = await db.car.update({
      where: { id },
      data: updateData
    })

    // Revalidate the cars list page
    revalidatePath("/admin/cars");

    return {
      success: true
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}


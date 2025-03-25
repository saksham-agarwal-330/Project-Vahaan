"use client";
import React, { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addCar, processCarImageWithAi } from "@/actions/cars";
import useFetch from "@/hooks/use-fetch";
import { useRouter } from "next/navigation";
import Image from "next/image";

const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const transmissionTypes = ["Manual", "Automatic", "Semi-Automatic"];
const bodyTypes = [
  "Sedan",
  "Hatchback",
  "SUV",
  "Crossover",
  "Coupe",
  "Convertible",
  "Wagon",
  "Van",
  "Pickup",
  "Truck",
];

const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];

const AddCarForm = () => {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedAiImage, setUploadedAiImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("ai");
  const [imageError, setImageError] = useState("");

  const carFormSchema = z.object({
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.string().refine((val) => {
      const year = parseInt(val);
      return (
        !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1
      );
    }, "Year must be a valid year"),
    price: z.string().min(1, "Price is required"),
    mileage: z.string().min(1, "Mileage is required"),
    fuelType: z.string().min(1, "Fuel Type is required"),
    transmission: z.string().min(1, "Transmission is required"),
    bodyType: z.string().min(1, "Body Type is required"),
    color: z.string().min(1, "Color is required"),
    seats: z.string().optional(),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    status: z.enum(carStatuses),
    featured: z.boolean().default(false),
  });

  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    handleSubmit,
    watch,
  } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      status: "AVAILABLE",
      featured: false,
    },
  });

  const onAiDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      setUploadedAiImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        toast.success("Image uploaded successfully");
      };

      reader.readAsDataURL(file);
    }
  };

  const { getRootProps: getAiRootProps, getInputProps: getAiInputProps } =
    useDropzone({
      onDrop: onAiDrop,
      accept: {
        "image/*": [".jpg", ".png", ".jpeg", ".webp"],
      },
      maxFiles: 1,
      multiple: false,
    });

  const {
    loading: processImageLoading,
    fn: processImageFn,
    data: processImageResult,
    error: processImageError,
  } = useFetch(processCarImageWithAi);

  const processWithAi = async () => {
    if (!uploadedAiImage) {
      toast.error("Please upload an image");
      return;
    }
    await processImageFn(uploadedAiImage);
  };

  useEffect(() => {
    if (processImageError) {
      toast.error(processImageError.message || "Error processing image");
    }
  }, [processImageError]);

  useEffect(() => {
    if (processImageResult?.success) {
      const carDetails = processImageResult.data;
      console.log(carDetails);
      // Extracted details
      setValue("make", carDetails.make);
      setValue("model", carDetails.model);
      setValue("year", carDetails.year.toString());
      setValue("price", carDetails.price);
      setValue("mileage", carDetails.mileage);
      setValue("color", carDetails.color);
      setValue("fuelType", carDetails.fuelType);
      setValue("transmission", carDetails.transmission);
      setValue("bodyType", carDetails.bodyType);
      setValue("description", carDetails.description);
      setValue("seats", carDetails.seats);

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages((prev) => [...prev, e.target.result]);
      };
      reader.readAsDataURL(uploadedAiImage);

      toast.success("Car details extracted successfully", {
        description: `Gemini AI extracted the following details from the image with ${Math.round(
          carDetails.confidence * 100
        )}% confidence`,
      });
      setActiveTab("manual");
    }
  }, [processImageResult, uploadedAiImage]);

  const {
    loading: addCarLoading,
    fn: addCarFn,
    data: addCarResult,
  } = useFetch(addCar);

  useEffect(() => {
    if (addCarResult?.success) {
      toast.success("Car added successfully");
      router.push("/admin/cars");
    }
  });

  const onSubmit = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image");
      return;
    }

    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseFloat(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,
    };

    await addCarFn({ carData, images: uploadedImages });
  };
  const onMultiImageDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) {
      return;
    }

    const newImages = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push(e.target.result);

        if (newImages.length === validFiles.length) {
          setUploadedImages((prev) => [...uploadedImages, ...newImages]);
          setImageError("");
          toast.success("Image uploaded successfully");
        }
      };

      reader.readAsDataURL(file);
    });
  };
  const {
    getRootProps: getMultiImageRootProps,
    getInputProps: getMultiImageInputProps,
  } = useDropzone({
    onDrop: onMultiImageDrop,
    accept: {
      "image/*": [".jpg", ".png", ".jpeg", ".webp"],
    },
    multiple: true,
  });

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };
  return (
    <div>
      <Tabs
        defaultValue="ai"
        className="mt-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai">AI Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Car Details Extraction</CardTitle>
              <CardDescription>
                Upload an image of a car and let Gemini AI extract its details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={imagePreview}
                        alt="Car Preview"
                        className="max-h-56 max-w-full object-contain mb-4"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImagePreview(null);
                            setUploadedAiImage(null);
                          }}
                        >
                          Remove Image
                        </Button>

                        <Button
                          size="sm"
                          onClick={processWithAi}
                          disabled={processImageLoading}
                        >
                          {processImageLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Camera className="mr-2 h-4 w-4" />
                              Extract Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      {...getAiRootProps()}
                      className="cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input {...getAiInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-600 text-sm">
                          Drag 'n' drop a car image , or click to select
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Supports:JPG,PNG,WebP (max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {processImageLoading && (
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-md flex items-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Analyzing image...</p>
                      <p className="text-sm">
                        Gemini AI is extracting car details
                      </p>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">How it works</h3>
                  <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
                    <li>Upload a clear image of the car</li>
                    <li>Click "Extract Details" to analyze with Gemini AI</li>
                    <li>Review the extracted information</li>
                    <li>Fill in any missing details manually</li>
                    <li>Add the car to your inventory</li>
                  </ol>
                </div>
                <div className="bg-amber-50 p-4 rounded-md">
                  <h3 className="font-medium text-amber-800 mb-1">
                    Tips for best results
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Use clear, well-lit images</li>
                    <li>• Try to capture the entire vehicle</li>
                    <li>• For difficult models, use multiple views</li>
                    <li>• Always verify AI-extracted information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Card Details</CardTitle>
              <CardDescription>
                Enter the details of the car you want to add.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input
                      type="text"
                      id="make"
                      placeholder="e.g. Toyota"
                      {...register("make")}
                      className={errors.make ? "border-red-500" : ""}
                    />
                    {errors.make && (
                      <p className="text-red-500 text-xs">
                        {errors.make.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      type="text"
                      id="model"
                      placeholder="e.g. Tiago"
                      {...register("model")}
                      className={errors.model ? "border-red-500" : ""}
                    />
                    {errors.model && (
                      <p className="text-red-500 text-xs">
                        {errors.model.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">year</Label>
                    <Input
                      type="text"
                      id="year"
                      placeholder="e.g. 2024"
                      {...register("year")}
                      className={errors.year ? "border-red-500" : ""}
                    />
                    {errors.year && (
                      <p className="text-red-500 text-xs">
                        {errors.year.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price(Rs.)</Label>
                    <Input
                      type="text"
                      id="price"
                      placeholder="e.g. 900000"
                      {...register("price")}
                      className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && (
                      <p className="text-red-500 text-xs">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      type="text"
                      id="mileage"
                      placeholder="e.g. 12000"
                      {...register("mileage")}
                      className={errors.mileage ? "border-red-500" : ""}
                    />
                    {errors.mileage && (
                      <p className="text-red-500 text-xs">
                        {errors.mileage.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="Color">Color</Label>
                    <Input
                      type="text"
                      id="color"
                      placeholder="e.g. gray"
                      {...register("color")}
                      className={errors.color ? "border-red-500" : ""}
                    />
                    {errors.color && (
                      <p className="text-red-500 text-xs">
                        {errors.color.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select
                      onValueChange={(value) => setValue("fuelType", value)}
                      defaultValue={getValues("fuelType")}
                    >
                      <SelectTrigger
                        className={errors.fuelType ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select Fuel Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((fuelType) => (
                          <SelectItem key={fuelType} value={fuelType}>
                            {fuelType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuelType && (
                      <p className="text-red-500 text-xs">
                        {errors.fuelType.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission Type</Label>
                    <Select
                      onValueChange={(value) => setValue("transmission", value)}
                      defaultValue={getValues("transmission")}
                    >
                      <SelectTrigger
                        className={errors.transmission ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select Transmission Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissionTypes.map((transmissionType) => (
                          <SelectItem
                            key={transmissionType}
                            value={transmissionType}
                          >
                            {transmissionType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transmission && (
                      <p className="text-red-500 text-xs">
                        {errors.transmission.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bodyType">Body Type</Label>
                    <Select
                      onValueChange={(value) => setValue("bodyType", value)}
                      defaultValue={getValues("bodyType")}
                    >
                      <SelectTrigger
                        className={errors.bodyType ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select Body Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((bodyType) => (
                          <SelectItem key={bodyType} value={bodyType}>
                            {bodyType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bodyType && (
                      <p className="text-red-500 text-xs">
                        {errors.bodyType.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seats">
                      Number of Seats{" "}
                      <span className="text-sm text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      type="text"
                      id="seats"
                      placeholder="e.g. 5"
                      {...register("seats")}
                      className={errors.seats ? "border-red-500" : ""}
                    />
                    {errors.seats && (
                      <p className="text-red-500 text-xs">
                        {errors.seats.message}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      onValueChange={(value) => setValue("status", value)}
                      defaultValue={getValues("status")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {carStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter detailed description of the car..."
                    className={`min-h-32 ${
                      errors.description ? "border-red-500" : ""
                    }`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>
                {/* Featured */}
                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id="featured"
                    checked={watch("featured")}
                    onCheckedChange={(checked) => {
                      setValue("featured", checked);
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="featured">Feature this car</Label>
                    <p className="text-sm text-gray-500">
                      Featured cars appear on the homepage
                    </p>
                  </div>
                </div>

                {/* Image Upload with Dropzone */}
                <div>
                  <Label
                    htmlFor="images"
                    className={imageError ? "text-red-500" : ""}
                  >
                    Images{" "}
                    {imageError && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="mt-2">
                    <div
                      {...getMultiImageRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition ${
                        imageError ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <input {...getMultiImageInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Drag & drop or click to upload multiple images
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          (JPG, PNG, WebP, max 5MB each)
                        </span>
                      </div>
                    </div>
                    {imageError && (
                      <p className="text-xs text-red-500 mt-1">{imageError}</p>
                    )}
                    {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  {/* Image Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">
                        Uploaded Images ({uploadedImages.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <Image
                              src={image}
                              alt={`Car image ${index + 1}`}
                              height={50}
                              width={50}
                              className="h-28 w-full object-cover rounded-md"
                              priority
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={addCarLoading}
                >
                  {addCarLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Car...
                    </>
                  ) : (
                    "Add Car"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AddCarForm;

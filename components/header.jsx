import React from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowLeft, CarFront, Heart, Layout } from "lucide-react";
import { checkUser } from "../lib/checkUser";

const Header = async ({ isAdminPage = false }) => {
  const user = await checkUser();
  const isAdmin = user?.role==="ADMIN";
  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <nav className="mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <Link href={isAdminPage ? "/admin" : "/"} className="flex">
            <Image
              src="/logo.png"
              width={200}
              height={600}
              alt="logo"
              className="h-12 w-auto object-contain"
            />
            {isAdminPage && (
              <span className="text-xs text-gray-500">Admin</span>
            )}
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {isAdminPage ? (
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft width={18} />
                <span className="hidden md:inline">Back to App</span>
              </Button>
            </Link>
          ) : (
            <SignedIn>
              <Link href="/saved-cars">
                <Button>
                  <Heart width={18} />
                  <span className="hidden md:inline">Saved Cars</span>
                </Button>
              </Link>

              {!isAdmin ? (
                <Link href="/reservations">
                  <Button variant="outline">
                    <CarFront width={18} />
                    <span className="hidden md:inline">My Reservations</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/admin">
                  <Button variant="outline">
                    <Layout width={18} />
                    <span className="hidden md:inline">Admin Portal</span>
                  </Button>
                </Link>
              )}
            </SignedIn>
          )}
        {/* </div> */}
        {/* <div className="flex items-center gap-2"> */}
          <SignedOut>
            <SignInButton forceRedirectUrl="/">
              <Button variant="outline">Login</Button>
            </SignInButton>
            {/* <SignUpButton /> */}
          </SignedOut>
          <SignedIn>
            <UserButton
            appearance={{
              elements:{
                avatarBox:"w-10 h-10",
              },
             }} />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;

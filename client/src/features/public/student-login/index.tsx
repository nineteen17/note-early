'use client';

import React from 'react';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function StudentLoginFeature() {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log("Student login form submitted (UI only - no logic)");
        alert("Login functionality not yet implemented.");
    };

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Student Login</CardTitle>
                <CardDescription>
                    Enter your access code or credentials.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="grid gap-4">
                    {/* Student ID Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <Input 
                            id="studentId" 
                            placeholder="Enter your assigned ID" 
                            required 
                        />
                    </div>
                    
                    {/* PIN Input - Using InputOTP */}
                    <div className="grid gap-2 items-center">
                        <Label htmlFor="pin">PIN</Label>
                        <div className="flex justify-center"> 
                             <InputOTP 
                                maxLength={4} 
                                id="pin"
                                containerClassName="group flex items-center"
                            >
                                <InputOTPGroup className="gap-2">
                                    <InputOTPSlot index={0} className="rounded-md border" />
                                    <InputOTPSlot index={1} className="rounded-md border" />
                                    <InputOTPSlot index={2} className="rounded-md border" />
                                    <InputOTPSlot index={3} className="rounded-md border" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    <Button type="submit" className="w-full">
                        Enter
                    </Button>
                </CardContent>
            </form>
            <CardFooter className="flex flex-col gap-2 pt-4 text-center text-sm">
                 {/* "Not a student?" link */}
                 <p>
                    <span className="text-muted-foreground">Not a student?{" "}</span>
                    <Link href="/login" className="underline">
                        Admin/Teacher Login
                    </Link>
                </p>
                 {/* "Need help?" link */}
                 <p className="pt-2">
                    <span className="text-muted-foreground">Need help?{" "}</span>
                    <Link href="/support" className="underline">
                        Contact Support
                    </Link>
                 </p>
            </CardFooter>
        </Card>
    );
} 
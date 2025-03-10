import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, usernameChangeSchema, type ChangePassword, type User as UserType, type UsernameChange } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  
  const passwordForm = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const usernameForm = useForm<UsernameChange>({
    resolver: zodResolver(usernameChangeSchema),
    defaultValues: {
      newUsername: user?.username || "",
    },
  });

  const changePasswordMutation = useMutation<{ success: boolean }, Error, ChangePassword>({
    mutationFn: async (data: ChangePassword) => {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to change password');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });
  
  const changeUsernameMutation = useMutation<{ success: boolean, user: UserType }, Error, UsernameChange>({
    mutationFn: async (data: UsernameChange) => {
      const response = await fetch('/api/user/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to change username');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setIsEditingUsername(false);
      // Update cache with the new user data
      if (data.user) {
        // Update the user data in the query cache
        queryClient.setQueryData(["/api/user"], data.user);
        
        // Trigger an additional refetch to ensure we have the latest data from the server
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
      
      toast({
        title: "Success",
        description: "Username changed successfully. Your new username will be displayed everywhere.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change username",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePassword) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate(data);
  };
  
  const onUsernameSubmit = (data: UsernameChange) => {
    if (data.newUsername === user?.username) {
      setIsEditingUsername(false);
      return;
    }
    changeUsernameMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Username</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditingUsername(!isEditingUsername)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {isEditingUsername ? "Cancel" : "Edit"}
                  </Button>
                </div>
                
                {isEditingUsername ? (
                  <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-2">
                    <Input
                      id="newUsername"
                      {...usernameForm.register("newUsername")}
                    />
                    {usernameForm.formState.errors.newUsername && (
                      <p className="text-sm text-destructive">
                        {usernameForm.formState.errors.newUsername.message}
                      </p>
                    )}
                    <div className="flex space-x-2 mt-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={changeUsernameMutation.isPending}
                      >
                        {changeUsernameMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsEditingUsername(false);
                          usernameForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-lg font-medium">{user?.username}</div>
                )}
              </div>
              <div>
                <Label>Role</Label>
                <div className="text-lg font-medium">
                  {user?.isAdmin ? "Administrator" : "User"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register("currentPassword")}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register("newPassword")}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Changing Password...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
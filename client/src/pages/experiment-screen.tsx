import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { experimentSubmissionSchema } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

type FormData = z.infer<typeof experimentSubmissionSchema>;

export default function ExperimentScreen() {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState("");

  // Form setup with zod validation
  const form = useForm<FormData>({
    resolver: zodResolver(experimentSubmissionSchema),
    defaultValues: {
      change_type: "modify",
      target_file: "",
      code_snippet: "",
      description: "",
      android_compatibility_check: true,
    },
  });

  // Fetch existing experiments
  const { data: experiments, isLoading } = useQuery({
    queryKey: ['/api/experiments'],
    queryFn: async () => {
      const res = await fetch('/api/experiments');
      if (!res.ok) throw new Error('Failed to fetch experiments');
      return res.json();
    }
  });

  // Submit experiment mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit experiment');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Experiment submitted",
        description: "Your changes will be validated and applied if successful.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit experiment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  // Handle JSON paste
  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      form.reset(parsed);
      toast({
        title: "JSON parsed successfully",
        description: "Form has been populated with the JSON data.",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Experiment Submission</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON Input</CardTitle>
            <CardDescription>
              Paste your JSON experiment definition here or use the form below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste JSON here..."
                className="font-mono"
              />
              <Button onClick={handleJsonPaste}>Parse JSON</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Experiment</CardTitle>
            <CardDescription>
              Define your code changes and validation requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="change_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select change type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="add">Add</SelectItem>
                          <SelectItem value="modify">Modify</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target File</FormLabel>
                      <FormControl>
                        <Input placeholder="path/to/file.tsx" {...field} />
                      </FormControl>
                      <FormDescription>
                        The file path relative to the project root
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code_snippet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code Snippet</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your code changes here..."
                          className="font-mono min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The exact code to be added or modified
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the purpose of these changes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="android_compatibility_check"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Android Compatibility Check</FormLabel>
                        <FormDescription>
                          Validate changes against Android-specific requirements
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Experiment"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Experiments History */}
        <Card>
          <CardHeader>
            <CardTitle>Experiment History</CardTitle>
            <CardDescription>
              Recent experiments and their validation status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {experiments?.map((exp: any) => (
                  <Card key={exp.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{exp.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {exp.target_file}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {format(new Date(exp.submitted_at), 'PPpp')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {exp.status === 'validated' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {exp.status === 'failed' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {exp.status === 'pending' && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

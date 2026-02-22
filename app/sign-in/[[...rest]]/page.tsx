import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/train");

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to Kairos AI</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-500",
              card: "bg-gray-900 border border-gray-800 shadow-xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
              formFieldInput:
                "bg-gray-800 border-gray-700 text-white placeholder-gray-500",
              formFieldLabel: "text-gray-300",
              footerActionLink: "text-blue-400",
              dividerLine: "bg-gray-700",
              dividerText: "text-gray-500",
            },
          }}
        />
      </div>
    </div>
  );
}

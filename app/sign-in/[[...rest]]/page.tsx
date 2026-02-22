import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/train");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to Kairos AI</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-500",
              card: "bg-white border border-gray-200 shadow-sm",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-500",
              socialButtonsBlockButton:
                "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
              formFieldInput:
                "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400",
              formFieldLabel: "text-gray-700",
              footerActionLink: "text-blue-600",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-400",
            },
          }}
        />
      </div>
    </div>
  );
}

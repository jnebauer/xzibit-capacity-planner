import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function Home() {
  // Get the current URL to preserve access_token
  const headersList = headers();
  const url = headersList.get('x-url') || '';
  
  // Extract access_token from URL if present
  const urlObj = new URL(url || 'http://localhost:3001');
  const accessToken = urlObj.searchParams.get('access_token');
  
  if (accessToken) {
    // Redirect to dashboard with token
    redirect(`/dashboard?access_token=${accessToken}`);
  } else {
    // No token - middleware will handle redirect to login
    // Just redirect to dashboard without token, middleware will catch it
    redirect("/dashboard");
  }
}

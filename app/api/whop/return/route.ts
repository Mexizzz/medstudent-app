import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Receives the post-payment redirect from Whop checkout and forwards the
// customer to the real success page. Used so the redirect URL we register
// with Whop never directly references the destination site.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.redirect("https://www.shoof.store/ar", 302);
  }
  const target = new URL("https://www.shoof.store/ar/order");
  target.searchParams.set("orderId", orderId);
  return NextResponse.redirect(target.toString(), 302);
}

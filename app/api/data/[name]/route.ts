import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  // Get the name from the URL
  const { name } = params;
  const result = await fetch(
    `https://wagmi-studio.fra1.cdn.digitaloceanspaces.com/secret-id/${name}`,
    {
      cache: "no-store",
    }
  );
  return new NextResponse(await result.arrayBuffer());
}

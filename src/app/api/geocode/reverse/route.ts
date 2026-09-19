import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: "Latitude and Longitude query parameters are required." }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid coordinates provided." }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "AgaateApp/1.0 (Operations Intake; contact@agaate.com)",
        "Accept": "application/json",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable", ok: false },
        { status: 502 }
      );
    }

    const data = await res.json();
    const addr = data.address || {};

    const village =
      addr.village ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.hamlet ||
      addr.residential ||
      addr.town ||
      "";

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      "";

    const taluk = addr.county || addr.state_district || addr.city_district || "";
    const state = addr.state || "";
    const pincode = (addr.postcode || "").replace(/\s+/g, "");

    const roadPart = [addr.road, addr.suburb || addr.neighbourhood].filter(Boolean).join(", ");
    const location = roadPart || (data.display_name ? data.display_name.split(",").slice(0, 3).join(",") : "");

    return NextResponse.json({
      ok: true,
      data: {
        village,
        city,
        taluk,
        state,
        pincode,
        location: location.trim(),
        displayName: data.display_name || "",
        latitude: lat,
        longitude: lng,
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to reverse geocode location at this time.",
      },
      { status: 500 }
    );
  }
}

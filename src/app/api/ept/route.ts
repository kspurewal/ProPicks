import { NextRequest, NextResponse } from 'next/server';
import { fetchNBAEPT, fetchMLBEPT, fetchNFLEPT, fetchNHLEPT } from '@/lib/ept';

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') || 'nba';

  try {
    let data;
    switch (sport) {
      case 'mlb':
        data = await fetchMLBEPT();
        break;
      case 'nfl':
        data = await fetchNFLEPT();
        break;
      case 'nhl':
        data = await fetchNHLEPT();
        break;
      case 'nba':
      default:
        data = await fetchNBAEPT();
        break;
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch ${sport.toUpperCase()} EPT rankings` },
      { status: 500 }
    );
  }
}

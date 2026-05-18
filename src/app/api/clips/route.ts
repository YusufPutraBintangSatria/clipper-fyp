import { NextResponse } from 'next/server';
import { getClips } from '@/app/actions';

/**
 * @swagger
 * /api/clips:
 *   get:
 *     summary: Mengambil semua daftar potongan video (clips)
 *     description: Mengembalikan daftar seluruh klip video yang ada di database lengkap dengan status dan metadatanya.
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan daftar klip.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: UUID unik klip.
 *                   title:
 *                     type: string
 *                     description: Judul klip.
 *                   status:
 *                     type: string
 *                     description: Status pemrosesan (pending, rendering, ready, failed).
 *                   videoPath:
 *                     type: string
 *                     description: Path lokal file video MP4.
 */
export async function GET() {
  const clips = await getClips();
  return NextResponse.json(clips);
}

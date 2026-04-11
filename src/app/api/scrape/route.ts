import { scrapeAndPersistStocks } from "@/server/stocks/service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string; stream?: boolean };

  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const result = await scrapeAndPersistStocks({
          code: body.code,
          onProgress(done, total, code) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done, total, code })}\n\n`)
            );
          }
        });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ ...result, finished: true })}\n\n`)
        );
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  }

  const result = await scrapeAndPersistStocks({ code: body.code });
  return Response.json(result);
}

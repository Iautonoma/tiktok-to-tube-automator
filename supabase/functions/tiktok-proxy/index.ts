import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TikTokProxyRequest {
  url: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { url }: TikTokProxyRequest = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate TikTok URL
    const tiktokPattern = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/
    if (!tiktokPattern.test(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid TikTok URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[TikTokProxy] Processing URL: ${url}`)

    // Call ssstik.io API
    const formData = new FormData()
    formData.append('id', url)
    formData.append('locale', 'pt')
    formData.append('tt', 'UGhUcVFx')

    const ssstikResponse = await fetch('https://ssstik.io/abc', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://ssstik.io/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000)
    })

    if (!ssstikResponse.ok) {
      console.error(`[TikTokProxy] ssstik.io error: ${ssstikResponse.status} ${ssstikResponse.statusText}`)
      return new Response(
        JSON.stringify({ 
          error: `ssstik.io request failed: ${ssstikResponse.statusText}`,
          status: ssstikResponse.status 
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const responseText = await ssstikResponse.text()
    
    // Extract download URL from response
    const downloadUrlMatch = responseText.match(/href="([^"]*\.mp4[^"]*)"/i)
    
    if (!downloadUrlMatch) {
      console.error('[TikTokProxy] Could not extract download URL from response')
      return new Response(
        JSON.stringify({ error: 'Could not extract download URL from ssstik.io response' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let downloadUrl = downloadUrlMatch[1]
    
    // Clean up the URL if it has HTML entities
    downloadUrl = downloadUrl.replace(/&amp;/g, '&')
    
    console.log(`[TikTokProxy] Successfully extracted download URL for: ${url}`)

    // Validate the download URL
    try {
      const videoResponse = await fetch(downloadUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      })
      
      if (!videoResponse.ok) {
        console.error(`[TikTokProxy] Video file not accessible: ${videoResponse.status}`)
        return new Response(
          JSON.stringify({ error: `Video file not accessible: ${videoResponse.statusText}` }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (validationError) {
      console.error(`[TikTokProxy] Video validation failed:`, validationError)
      // Continue anyway as some valid URLs might fail HEAD requests
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl,
        originalUrl: url
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('[TikTokProxy] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'TikTok proxy failed'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
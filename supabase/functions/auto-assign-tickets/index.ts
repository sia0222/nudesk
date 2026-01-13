import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Supabase 클라이언트 초기화 (Service Role Key 사용으로 RLS 우회)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. 4시간 전 시간 계산
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
    const thresholdDate = new Date(Date.now() - FOUR_HOURS_MS).toISOString()

    console.log(`Checking tickets created before: ${thresholdDate}`)

    // 3. 조건에 맞는 티켓 업데이트
    // - 상태가 'WAITING'이고
    // - 생성된 지 4시간이 지난 경우
    const { data, error, count } = await supabase
      .from('tickets')
      .update({ 
        status: 'ACCEPTED', 
        is_auto_assigned: true 
      })
      .eq('status', 'WAITING')
      .lt('created_at', thresholdDate)
      .select()

    if (error) throw error

    console.log(`Successfully auto-assigned ${data?.length ?? 0} tickets.`)

    return new Response(
      JSON.stringify({ 
        message: 'Auto-assignment completed', 
        updated_count: data?.length ?? 0,
        tickets: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in auto-assign-tickets:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

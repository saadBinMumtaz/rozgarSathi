$base = 'http://localhost:5000/api'
$good = 'In my last role, the situation was that our team faced a tight deadline. My task and responsibility was to lead the effort. I took specific actions like planning and pairing with teammates. The outcome and result were that we shipped on time, and I learned a lot from the experience.'
$weak = 'I did some work once and it was fine I guess.'
$bad = 'fuck this shit'
$bad2 = 'asdf qwer zxcv aaaa bbbb cccc dddd eeee ffff gggg'

$s = Invoke-RestMethod -Uri "$base/sessions" -Method POST -ContentType 'application/json' -Body '{"mode":"behavioral"}'
$sid = $s.sessionId
Write-Output "SESSION: $sid"

$r1 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body '{}'
Write-Output "1) $($r1.nextAction) | q=$($r1.nextQuestion.questionId) | $($r1.nextQuestion.questionText.Substring(0,40))..."

$r2 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $good } | ConvertTo-Json)
Write-Output "2) $($r2.nextAction) | score=$($r2.evaluation.score) | next=$($r2.nextQuestion.questionId)"

$r3 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $bad } | ConvertTo-Json)
Write-Output "3) $($r3.nextAction) | nudge=$($r3.nudge)"

$r4 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $bad2 } | ConvertTo-Json)
Write-Output "4) $($r4.nextAction) | score=$($r4.evaluation.score) | conf=$($r4.evaluation.confidenceLevel) | next=$($r4.nextQuestion.questionId)"

$r5 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $weak } | ConvertTo-Json)
Write-Output "5) $($r5.nextAction) | score=$($r5.evaluation.score) | followUp=$($r5.followUp)"

$r6 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $good } | ConvertTo-Json)
Write-Output "6) $($r6.nextAction) | score=$($r6.evaluation.score) | next=$($r6.nextQuestion.questionId)"

$r7 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $good } | ConvertTo-Json)
Write-Output "7) $($r7.nextAction) | next=$($r7.nextQuestion.questionId)"

$r8 = Invoke-RestMethod -Uri "$base/sessions/$sid/answer" -Method POST -ContentType 'application/json' -Body (@{ transcript = $good } | ConvertTo-Json)
Write-Output "8) $($r8.nextAction) | overall=done"

$session = Invoke-RestMethod -Uri "$base/sessions/$sid"
$ids = $session.questions | ForEach-Object { $_.questionId }
Write-Output "QUESTION IDS: $($ids -join ', ')"
$unique = ($ids | Select-Object -Unique).Count
Write-Output "TOTAL=$($ids.Count) UNIQUE=$unique STATUS=$($session.status) OVERALL=$($session.overallScore)"
$ups = $session.questions | ForEach-Object { "$($_.questionId):[$($_.followUps -join ' | ')]" }
$ups | ForEach-Object { Write-Output "FU $_" }

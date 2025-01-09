"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  // -------- State --------
  const [velocity, setVelocity] = useState(50);
  const [angle, setAngle] = useState(45);
  const [isShooting, setIsShooting] = useState(false);
  const [hitTarget, setHitTarget] = useState(false);
  const [level, setLevel] = useState(1);
  const [bestStage, setBestStage] = useState(1);
  const [remainingBall, setRemainingBall] = useState(5);
  const [over, setOver] = useState(false);
  const [oneShot, setOneShot] = useState(0);

  // ** เพิ่ม State สำหรับขนาดเป้า (เริ่ม 20 px) **
  const [targetRadius, setTargetRadius] = useState(30);

  // ปุ่ม "ด่านต่อไป" หลังยิงโดน
  const [showStartButton, setShowStartButton] = useState(false);

  // -------- Refs --------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef<number | null>(null);

  // เก็บการยิง (linesRef)
  const linesRef = useRef<
    Array<{
      velocity: number;
      angle: number;
      points: Array<{ x: number; y: number }>;
      finalX?: number;
      finalY?: number;
    }>
  >([]);

  // -------- ค่าคงที่ --------
  const g = 9.8;
  const groundY = 400;
  const playerX = 50;
  const playerY = groundY;
  const playerWidth = 30;
  const playerHeight = 50;
  const bulletRadius = 5;

  // ตำแหน่งเป้า (X, Y) - เริ่มต้น
  const [targetX, setTargetX] = useState(600);
  const [targetY, setTargetY] = useState(350);

  // ===== ฟังก์ชันวาดลูกศร (พร้อมข้อความ (v,a)) =====
  function drawArrow(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    angleDeg: number,
    length: number
  ) {
    const rad = (angleDeg * Math.PI) / 180;

    // ปลายลูกศร
    const endX = startX + length * Math.cos(rad);
    const endY = startY - length * Math.sin(rad);

    // วาดลำตัวลูกศร
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();

    // วาดหัวลูกศร
    const headLength = 10;
    const angleLeft = rad + (30 * Math.PI) / 180;
    const angleRight = rad - (30 * Math.PI) / 180;

    const leftX = endX - headLength * Math.cos(angleLeft);
    const leftY = endY + headLength * Math.sin(angleLeft);
    const rightX = endX - headLength * Math.cos(angleRight);
    const rightY = endY + headLength * Math.sin(angleRight);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.lineTo(endX, endY);
    ctx.fillStyle = "blue";
    ctx.fill();

    // ---- วาดข้อความ (v, a) ที่ปลายลูกศร ----
    const label = `(ความเร็ว ${velocity}, มุม ${angleDeg})`;
    ctx.font = "14px Arial";

    // วัดความกว้างของข้อความ
    const textWidth = ctx.measureText(label).width;
    const textHeight = 16;
    const padding = 4;

    // ตำแหน่งที่จะแสดงข้อความ (เหนือปลายลูกศรเล็กน้อย)
    const labelX = endX;
    const labelY = endY - 10;

    // กล่องพื้นหลัง (สีดำ)
    ctx.fillStyle = "black";
    ctx.fillRect(
      labelX - padding,
      labelY - textHeight - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // ตัวหนังสือสีขาว
    ctx.fillStyle = "white";
    ctx.fillText(label, labelX, labelY - padding);
  }

  // ===== ฟังก์ชันวาดฉาก (พื้น, ตัวละคร, เป้า) =====
  const drawScene = (ctx: CanvasRenderingContext2D) => {
    // พื้นหลังขาว
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // พื้นสีเขียว (ตั้งแต่ y=groundY ลงไป)
    ctx.fillStyle = "green";
    ctx.fillRect(0, groundY, ctx.canvas.width, ctx.canvas.height - groundY);

    // ตัวละคร (สีม่วง)
    ctx.fillStyle = "purple";
    ctx.fillRect(playerX, playerY - playerHeight, playerWidth, playerHeight);

    // เป้า (สีน้ำเงิน) - ใช้ค่า targetRadius จาก State
    ctx.beginPath();
    ctx.arc(targetX, targetY, targetRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();
  };

  // ===== ฟังก์ชันวาดเส้นที่ยิงทั้งหมด =====
  const drawAllLines = (ctx: CanvasRenderingContext2D) => {
    linesRef.current.forEach((line) => {
      const pts = line.points;
      if (pts.length === 0) return;

      // ลากเส้นแดง
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // ถ้ามี finalX, finalY => วาด label (v,a)
      if (line.finalX !== undefined && line.finalY !== undefined) {
        const text = `ความเร็ว ${line.velocity}, มุม ${line.angle})`;
        ctx.font = "14px Arial";
        const textWidth = ctx.measureText(text).width;
        const textHeight = 16;
        const padding = 4;

        const labelX = line.finalX;
        const labelY = line.finalY - 10;

        // กล่องดำ
        ctx.fillStyle = "black";
        ctx.fillRect(
          labelX - padding,
          labelY - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );
        // ข้อความสีขาว
        ctx.fillStyle = "white";
        ctx.fillText(text, labelX, labelY - padding);
      }
    });
  };

  // ===== ฟังก์ชัน redrawAll: วาดฉาก + เส้น + ลูกศร (ถ้ายังไม่ยิง) =====
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1) วาดฉาก
    drawScene(ctx);
    // 2) วาดเส้นเก่า (ถ้ามี)
    drawAllLines(ctx);
    // 3) ถ้ายังไม่ยิง => วาดลูกศรพร้อม label (v,a)
    if (!isShooting && !hitTarget && !showStartButton) {
      const muzzleX = playerX + playerWidth / 2;
      const muzzleY = playerY - playerHeight;
      drawArrow(ctx, muzzleX, muzzleY, angle, 60);
    }
  };

  // ===== ตรวจสอบการชน =====
  const checkCollision = (bulletX: number, bulletY: number) => {
    const dx = bulletX - targetX;
    const dy = bulletY - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < targetRadius + bulletRadius;
  };

  // ===== ยิง =====
  const handleShoot = () => {
    setOneShot(oneShot + 1);
    setIsShooting(true);
    setHitTarget(false);
    setRemainingBall(remainingBall - 1);
    // บันทึกค่าการยิงครั้งนี้
    linesRef.current.push({
      velocity,
      angle,
      points: [],
    });
  };

  // ===== รีเซ็ต =====
  const handleReset = () => {
    if (level > bestStage) {
      setBestStage(level);
    }
    setIsShooting(false);
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    setHitTarget(false);

    // ล้างเส้นการยิงทั้งหมด
    linesRef.current = [];

    redrawAll();
    setShowStartButton(false);
    setOver(false);
    setRemainingBall(5);
    setOneShot(0);
    setLevel(1);
    // รีเซ็ตขนาดเป้ากลับไป 20
    setTargetRadius(30);
  };

  const handleNext = () => {
    setIsShooting(false);
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    setHitTarget(false);

    // ล้างเส้นการยิงทั้งหมด
    linesRef.current = [];

    redrawAll();
    setShowStartButton(false);
    setOver(false);
    if (oneShot == 1) {
      setRemainingBall(remainingBall + 2);
    } else {
      setRemainingBall(remainingBall + 1);
    }
    setOneShot(0);
  };

  // ===== ด่านต่อไป (*** จุดปรับลดขนาดเป้าเมื่อผ่านทุก 5 ด่าน ***) =====
  const handleNextLevel = () => {
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    // ตั้ง level ใหม่
    setLevel((prev) => {
      const newLevel = prev + 1;
      // ถ้า newLevel เป็น 3,6,9,... => ลดขนาดเป้า
      if (newLevel % 3 === 0) {
        setTargetRadius((oldRad) => Math.max(5, oldRad - 1));
        // ลด 2 px และไม่ให้ต่ำกว่า 5
      }
      return newLevel;
    });

    // สุ่มเป้า
    const randomX = Math.floor(Math.random() * (750 - 400 + 1)) + 400;
    const randomY = Math.floor(Math.random() * (350 - 50 + 1)) + 50;
    setTargetX(randomX);
    setTargetY(randomY);

    setHitTarget(false);
    setIsShooting(false);

    linesRef.current = [];

    redrawAll();
    setShowStartButton(true);
  };

  // ===== อนิเมชันลูกกระสุน =====
  const animateProjectile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = Date.now();

    const drawFrame = () => {
      const t = (Date.now() - startTime) / 1000;
      const rad = (angle * Math.PI) / 180;
      const x = velocity * Math.cos(rad) * t;
      const y = velocity * Math.sin(rad) * t - 0.5 * g * t * t;

      // วาดฉาก
      drawScene(ctx);
      // วาดเส้นเก่า
      drawAllLines(ctx);

      // ตำแหน่งกระสุน
      const bulletStartX = playerX + playerWidth / 2;
      const bulletStartY = playerY - playerHeight;
      const bulletX = bulletStartX + x;
      const bulletY = bulletStartY - y;

      if (bulletY <= groundY) {
        const currentShotIndex = linesRef.current.length - 1;
        linesRef.current[currentShotIndex].points.push({
          x: bulletX,
          y: bulletY,
        });

        // วาดกระสุน
        ctx.beginPath();
        ctx.arc(bulletX, bulletY, bulletRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();

        if (bulletX < 0 || bulletX > canvas.width || bulletY < 0) {
          setIsShooting(false);
          if (remainingBall <= 0) {
            setOver(true);
          }
          // บันทึก finalX, finalY
          linesRef.current[currentShotIndex].finalX = bulletX;
          linesRef.current[currentShotIndex].finalY = bulletY;

          redrawAll();
          return;
        }
        // ตรวจชน
        if (!hitTarget) {
          const isHit = checkCollision(bulletX, bulletY);
          if (isHit) {
            setHitTarget(true);
            setIsShooting(false);

            linesRef.current[currentShotIndex].finalX = bulletX;
            linesRef.current[currentShotIndex].finalY = bulletY;

            redrawAll();
            handleNextLevel();
            return;
          }
        }
      } else {
        // ตกพื้น
        if (remainingBall <= 0) {
          setOver(true);
        }
        setIsShooting(false);
        const currentShotIndex = linesRef.current.length - 1;
        linesRef.current[currentShotIndex].finalX = bulletX;
        linesRef.current[currentShotIndex].finalY = bulletY;

        redrawAll();
        return;
      }

      requestIdRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

  // ===== useEffect: isShooting => animate =====
  useEffect(() => {
    if (isShooting) {
      animateProjectile();
    } else {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    }
    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, [isShooting]);

  // ===== useEffect: mount => วาดฉากครั้งแรก =====
  useEffect(() => {
    redrawAll();
  }, []);

  // ===== useEffect: เมื่อ angle, velocity เปลี่ยน และยังไม่ยิง => วาดลูกศรใหม่ + เส้นเก่า =====
  useEffect(() => {
    if (!isShooting && !hitTarget && !showStartButton) {
      redrawAll();
    }
  }, [angle, velocity, isShooting, hitTarget, showStartButton]);

  return (
    <div style={{ textAlign: "center", marginTop: 50, position: "relative" }}>
      <h1>
        Projectile Game Stage {level} (Highest Stage {bestStage})
      </h1>
      <br />
      <h1>เหลือบอล {remainingBall} ลูก</h1>
      <br />
      <div style={{ marginBottom: 20, borderSpacing: 10 }}>
        <label>
          ความเร็ว (0-100):
          <input
            type="number"
            value={velocity}
            min={0}
            max={110}
            onChange={(e) => {
              let v = Number(e.target.value);
              v = Math.max(0, Math.min(100, v));
              setVelocity(v);
            }}
            style={{ color: "black" }}
          />
        </label>
        <label>
          มุม (0-90):
          <input
            type="number"
            value={angle}
            min={0}
            max={90}
            onChange={(e) => {
              let a = Number(e.target.value);
              a = Math.max(0, Math.min(90, a));
              setAngle(a);
            }}
            style={{ color: "black" }}
          />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        style={{
          border: "1px solid black",
          display: "block",
          margin: "20px auto",
        }}
      />

      {showStartButton && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "20px",
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: "10px",
          }}
        >
          <p style={{ color: "red" }}>!! ยิงโดนแล้ว !!</p>
          <p style={{ color: "white" }}>!! ไปด่านต่อไปกันเถอะ !!</p>
          <br />
          <button onClick={handleNext}>ด่านต่อไป</button>
        </div>
      )}

      {over && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "20px",
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: "10px",
          }}
        >
          <p style={{ color: "red" }}>!! บอลหมดแล้ว !!</p>
          <p style={{ color: "lightgreen" }}>มาได้ถึงด่านที่ {level}</p>
          <br />
          <button onClick={handleReset}>เริ่มเล่นใหม่</button>
        </div>
      )}
      <div>
        {!isShooting && !hitTarget && !showStartButton && (
          <button
            onClick={handleShoot}
            style={{
              marginRight: 20,
              width: 50,
              height: 25,
              backgroundColor: "white",
              color: "black",
            }}
          >
            ยิง
          </button>
        )}
        {/* <button
          onClick={handleReset}
          style={{
            marginRight: 20,
            width: 50,
            height: 25,
            backgroundColor: "white",
            color: "black",
          }}
        >
          รีเซ็ต
        </button> */}
      </div>
    </div>
  );
}

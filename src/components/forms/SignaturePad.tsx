import { Eraser } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FieldWrapper, getInputBorderClass, inputBaseClasses } from './FormControls';

interface SignaturePadProps {
  form: UseFormReturn<any>;
}

export function SignaturePad({ form }: SignaturePadProps) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');

  const authErrors = (errors.authorization || {}) as Record<string, any>;
  const existingSignature = watch('authorization.signatureData');

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current && existingSignature?.startsWith('data:image/')) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = existingSignature;
    }
  }, [mode]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.strokeStyle = '#0F2744';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setDrawing(true);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function endDraw() {
    if (!drawing || !canvasRef.current) return;
    setDrawing(false);
    setValue('authorization.signatureData', canvasRef.current.toDataURL('image/png'), {
      shouldValidate: true,
    });
  }

  function clearCanvas() {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setTypedSignature('');
    setValue('authorization.signatureData', '', { shouldValidate: true });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-8">
          <FieldWrapper
            id="printedName"
            label="Printed Full Name"
            required
            error={authErrors.printedName?.message}
          >
            <input
              id="printedName"
              type="text"
              {...register('authorization.printedName')}
              className={`${inputBaseClasses} ${getInputBorderClass(!!authErrors.printedName)}`}
              placeholder="Enter your full legal name"
            />
          </FieldWrapper>
        </div>

        <div className="sm:col-span-4">
          <FieldWrapper
            id="signatureDate"
            label="Date"
            required
            error={authErrors.signatureDate?.message}
          >
            <input
              id="signatureDate"
              type="text"
              readOnly
              {...register('authorization.signatureDate')}
              className={`${inputBaseClasses} bg-slate-50 text-slate-700 tabular-nums border-slate-300`}
            />
          </FieldWrapper>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-semibold text-slate-800">
            Applicant Electronic Signature <span className="text-red-700">*</span>
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('draw');
                clearCanvas();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'draw'
                  ? 'bg-white text-[#0F2744] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draw Signature
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('type');
                clearCanvas();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'type'
                  ? 'bg-white text-[#0F2744] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Type E-Signature
            </button>
          </div>
        </div>

        <Controller
          control={control}
          name="authorization.signatureData"
          render={({ field }) => (
            <div className="space-y-2">
              {mode === 'draw' ? (
                <div className="border border-slate-300 rounded-xl bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={160}
                    onPointerDown={startDraw}
                    onPointerMove={moveDraw}
                    onPointerUp={endDraw}
                    onPointerCancel={endDraw}
                    aria-label="Signature drawing pad"
                    className="w-full h-36 touch-none cursor-crosshair block bg-white"
                  />
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Sign inside the box with your mouse or finger
                    </span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 text-xs font-semibold text-slate-700 hover:text-[#0F2744] hover:bg-slate-200/70 rounded-md"
                    >
                      <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    id="typedSignature"
                    type="text"
                    value={typedSignature}
                    onChange={(e) => {
                      setTypedSignature(e.target.value);
                      field.onChange(e.target.value.trim());
                    }}
                    placeholder="Type your full name as your electronic signature"
                    className={`${inputBaseClasses} italic font-serif text-lg ${getInputBorderClass(
                      !!authErrors.signatureData
                    )}`}
                  />
                  <p className="text-xs text-slate-500">
                    Typing your name above constitutes a legally binding electronic signature.
                  </p>
                </div>
              )}
              {authErrors.signatureData && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {authErrors.signatureData.message}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}

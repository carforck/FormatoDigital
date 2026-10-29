"use client";

/**
 * iPhone y iPad: Safari acerca la pantalla al enfocar un campo con letra menor de 16 px y no
 * la devuelve. Los campos del aplicativo ya usan 16 px en el celular (globals.css); los de las
 * plantillas (`EditableText` dentro de `.doc-print`) conservan la letra del formato para que la
 * vista previa y el PDF sean fieles, así que en iOS se agrega `maximum-scale=1` al viewport.
 * iOS lo usa solo para no acercar al enfocar: el usuario igual puede pellizcar para ampliar.
 * En Android y escritorio no se toca (allí sí bloquearía el zoom). No cambia la impresión.
 */
import { useEffect } from "react";

export function SinZoomIOS() {
  useEffect(() => {
    // iPadOS se presenta como Mac: se reconoce por la pantalla táctil
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!ios) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (meta && !/maximum-scale/.test(meta.content)) meta.content = `${meta.content}, maximum-scale=1`;
  }, []);
  return null;
}

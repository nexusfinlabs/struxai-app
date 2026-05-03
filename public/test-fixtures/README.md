# Test fixtures

Ficheros mínimos válidos para probar manualmente los visores
implementados en `src/components/viewers/`.

| Fichero      | Visor                | Notas                                 |
|--------------|----------------------|---------------------------------------|
| sample.pdf   | PdfViewer            | PDF 1.4 con una sola página de texto. |
| cube.stl     | ThreeDViewer (STL)   | Cubo unidad ASCII.                    |
| cube.obj     | ThreeDViewer (OBJ)   | Cubo unidad con caras quad.           |
| sample.ifc   | IfcViewer (web-ifc)  | Muro extruído IFC4 + 1 storey.        |
| sample.dxf   | ApsViewer (Autodesk) | Cuadrado 100×100 en model space.      |

No se incluye `.rvt` porque la generación requiere Revit. Para
probar el visor APS con familias Revit basta con subir cualquier
`.rvt`/`.rfa`/`.rte` real desde la UI.

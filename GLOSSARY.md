# Registro de Gastos

Vocabulario para distinguir los movimientos de dinero y su significado en el registro de gastos personales.

## Lenguaje

**Cuenta**:
Unidad con la que el usuario identifica dónde mantiene su dinero, siempre en una única moneda; puede representar una cuenta bancaria o efectivo. Los fondos en monedas distintas se distinguen en cuentas separadas, aunque pertenezcan al mismo banco.
_Evitar_: banco como sinónimo de toda cuenta; fuente de datos como sinónimo de cuenta.

**Cuenta de origen**:
Cuenta de la que sale el dinero de una operación. En un gasto identifica con qué fondos se pagó, independientemente de cómo se recibió la información.
_Evitar_: origen del email o canal de ingreso como sinónimo de cuenta de origen.

**Cuenta de destino**:
Cuenta en la que se acredita el dinero de una transferencia propia o conversión. Es distinta de la institución que pueda intermediar en el cambio de moneda.

**Importe del gasto**:
Dinero efectivamente debitado de la cuenta de origen por el gasto, expresado en la moneda de esa cuenta; en efectivo, es el dinero efectivamente pagado. Un precio del comercio en otra moneda no sustituye ese importe.
_Evitar_: precio original del comercio como sinónimo cuando difiera del importe debitado.

**Evento de fuente**:
Registro de una entrada recibida y su procedencia, conservado sin modificar su contenido original. Puede servir como evidencia de un movimiento financiero, pero no equivale por sí solo a un movimiento registrado.
_Evitar_: gasto o movimiento como sinónimo de evento de fuente.

**Entrada pendiente de revisión**:
Entrada cuyo contenido no pudo interpretarse, carece de datos esenciales o presenta dudas que impiden registrar un movimiento financiero con confianza. Conserva su evidencia mientras se completa o corrige su interpretación.
_Evitar_: gasto registrado como sinónimo de entrada pendiente.

**Entrada descartada**:
Entrada retirada de la revisión pendiente por decisión del usuario, conservando su evidencia original. No participa en los totales ni en el contador de pendientes. Puede recuperarse para volver a revisión sin registrar automáticamente un movimiento.
_Evitar_: entrada borrada como sinónimo de entrada descartada.

**Movimiento anulado**:
Movimiento financiero registrado que el usuario deja sin efecto, sin borrarlo. No participa en los totales y conserva su evidencia e historial de cambios. Puede restaurarse para volver a participar en los totales que correspondan según su naturaleza y los filtros aplicados.
_Evitar_: movimiento borrado o entrada pendiente descartada como sinónimo de movimiento anulado.

**Entrada confiable**:
Entrada completa cuyos datos obligatorios tienen respaldo explícito, son coherentes y no presentan ambigüedades ni contradicciones sin resolver. Tener todos los campos no basta para considerarla confiable.
_Evitar_: entrada completa como sinónimo de entrada confiable.

**Gasto pendiente de revisión**:
Entrada identificada como gasto cuya interpretación requiere completarse o corregirse antes de su registro financiero. Mientras siga pendiente, no participa en los totales de gastos.
_Evitar_: gasto registrado como sinónimo de gasto pendiente de revisión.

**Transferencia entre cuentas propias**:
Traslado de dinero entre cuentas de una misma persona, del mismo banco o de bancos distintos. El capital trasladado no constituye por sí mismo un gasto.
_Evitar_: gasto como sinónimo de transferencia propia.

**Retiro de efectivo**:
Transferencia de dinero desde una cuenta bancaria del usuario hacia una cuenta de efectivo propia. No constituye un gasto; el gasto se registra cuando se paga desde la cuenta de efectivo.
_Evitar_: gasto como sinónimo de retiro.

**Conversión de moneda**:
Intercambio de un importe expresado en una moneda por otro importe expresado en una moneda diferente, por ejemplo de USD a UYU. Puede formar parte de un traslado entre cuentas propias.
_Evitar_: transferencia como único término cuando sea necesario distinguir que hubo un cambio de moneda.

**Tipo de cambio efectivo**:
Relación entre el importe realmente debitado y el realmente acreditado en las dos monedas de una conversión, identificando las monedas y el sentido en que se expresa. Refleja el resultado de la operación, que puede diferir de una cotización informada por la institución.
_Evitar_: cotización de mercado o cotización informada como sinónimo de tipo de cambio efectivo; número sin monedas ni unidad de referencia.

**Institución de conversión**:
Entidad o medio por el que se realiza el cambio de moneda, como Itaú o Prex. Es un dato opcional: su ausencia por sí sola no bloquea el registro de la conversión. Puede ser diferente de la institución de las cuentas de origen o destino y no se infiere a partir de ellas.
_Evitar_: cuenta de origen o fuente de datos como sinónimo de institución de conversión.

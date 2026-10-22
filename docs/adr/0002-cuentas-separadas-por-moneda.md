# Cuentas separadas por moneda

El usuario mantiene fondos en varios bancos y en efectivo, tanto en pesos como en dólares, y necesita seguir conversiones entre monedas. Se acuerda representar cada cuenta de la app con una única moneda: por ejemplo, Itaú pesos, Itaú dólares, Efectivo pesos y Efectivo dólares. Esto permite distinguir con precisión el origen y destino de los fondos sin tener que elegir una moneda dentro de una cuenta multimoneda.

Se consideró agrupar varias monedas dentro de una misma cuenta. Se elige separarlas para que la identidad de cada cuenta incluya una moneda inequívoca y para representar las conversiones entre cuentas distintas, aunque el banco agrupe ambas bajo un mismo producto.

El conjunto de cuentas es ampliable. La decisión también se aplica al efectivo y no incorpora cálculo de saldos al MVP.

Para gastos, el importe principal es siempre el efectivamente debitado de la cuenta de origen y su moneda coincide con la de esa cuenta. Un precio original del comercio expresado en otra moneda queda como referencia en la evidencia disponible, sin duplicar el gasto; si el importe debitado es desconocido, se requiere revisión y no se estima una conversión. Se elige este criterio para representar cuánto dinero salió realmente de la cuenta.

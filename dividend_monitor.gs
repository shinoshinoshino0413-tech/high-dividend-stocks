const SHEET_NAME = '一覧';
const DATA_START_ROW = 5;      // データ開始行（1行目=1）
const COL_CODE = 1;            // A列: 証券コード
const COL_TARGET_YIELD = 25;   // Y列: 目安利回り（%）
const COL_DIVIDEND = 30;       // AD列: 配当金
const COL_TARGET_PRICE = 31;   // AE列: 目安株価
const COL_PRICE = 32;          // AF列: 株価
const COL_YIELD = 33;          // AG列: x/xx配当利回り
const BATCH_SIZE = 20;         // バッチサイズ（大きすぎると失敗しやすい）
const MAX_PRICE_FALLBACKS = 20;
const MAX_DIVIDEND_FALLBACKS = 20;

// リアルなブラウザに近い User-Agent を使う
const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
};

/**
 * 初回セットアップ:
 *  - AE列（目安株価）の式を設定
 *  - AG列（配当利回り）の式を設定
 *  - AD列（配当金）/AF列（株価）をYahoo Financeから更新
 */
function initialSetup() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const rowCount = getActiveRowCount_(sheet);
  if (rowCount === 0) {
    SpreadsheetApp.getUi().alert('A列に証券コードがありません。');
    return;
  }

  applyDerivedFormulas_(sheet, rowCount);
  const summary = updateMarketData_({ sheet, updatePrice: true, updateDividend: true });
  const noDataMessage = summary.priceUpdated === 0 && summary.dividendUpdated === 0
    ? '\n\n取得件数が0件です。Apps Script の「実行ログ」を確認してください。'
    : '';

  SpreadsheetApp.getUi().alert(
    'セットアップ完了！\n' +
    `・株価（AF列）: ${summary.priceUpdated}社を更新しました\n` +
    `・配当金（AD列）: ${summary.dividendUpdated}社を更新しました\n` +
    '・目安株価（AE列）: Y列の目安利回りから自動計算します\n' +
    '・配当利回り（AG列）: 配当金 ÷ 株価 で自動計算します\n\n' +
    '株価と配当金はメニューから再取得できます。' +
    noDataMessage
  );
}

/**
 * 配当金のみ更新する。
 */
function updateDividends() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const summary = updateMarketData_({ sheet, updatePrice: false, updateDividend: true });
  SpreadsheetApp.getUi().alert(`配当金データの更新が完了しました。更新件数: ${summary.dividendUpdated}件`);
}

/**
 * 株価のみ更新する。
 */
function updatePrices() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const summary = updateMarketData_({ sheet, updatePrice: true, updateDividend: false });
  SpreadsheetApp.getUi().alert(`株価データの更新が完了しました。更新件数: ${summary.priceUpdated}件`);
}

/**
 * 株価・配当金をまとめて更新する。
 */
function updateAllMarketData() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const summary = updateMarketData_({ sheet, updatePrice: true, updateDividend: true });
  SpreadsheetApp.getUi().alert(
    `更新完了\n株価: ${summary.priceUpdated}件\n配当金: ${summary.dividendUpdated}件` +
    (summary.priceUpdated === 0 && summary.dividendUpdated === 0
      ? '\n\n取得件数が0件です。Apps Script の実行ログを確認してください。'
      : '')
  );
}

/**
 * 接続状況を診断してアラートで表示する。
 * ① シートの証券コード読み取り
 * ② Yahoo Finance クランブ認証
 * ③ 株価 API（クランブあり）
 * ④ 株価 API（クランブなし・query2）
 * ⑤ 株価チャート API
 * ⑥ Stooq フォールバック
 * ⑦ みんかぶ 配当金
 */
function runDiagnostics() {
  const lines = [];

  // ① シートと証券コード確認
  lines.push('▼ シート確認');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`「${SHEET_NAME}」シートが見つかりません。`);
    return;
  }
  const rowCount = getActiveRowCount_(sheet);
  lines.push(`  有効行数: ${rowCount}`);
  if (rowCount === 0) {
    SpreadsheetApp.getUi().alert(lines.join('\n') + '\n\nA列に4桁の証券コードが見つかりません。');
    return;
  }
  const firstCode = normalizeCode_(
    sheet.getRange(DATA_START_ROW, COL_CODE).getDisplayValue()
  );
  lines.push(`  先頭コード: ${firstCode || '（無効）'}`);

  // ② クランブ認証
  lines.push('\n▼ Yahoo Finance 認証（クランブ）');
  CacheService.getScriptCache().removeAll(['yahoo_crumb', 'yahoo_cookie']);
  let auth = null;
  try {
    auth = getYahooCrumb_();
    lines.push(auth ? `  成功: crumb=${auth.crumb.substring(0, 12)}...` : '  失敗: null が返された');
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  const testCode = firstCode || '7203';

  // ③ 株価 API（クランブあり）
  lines.push('\n▼ 株価 API / query1（クランブあり）');
  try {
    const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${testCode}.T${crumbParam}`;
    const headers = { ...BASE_HEADERS, 'Accept': 'application/json' };
    if (auth) headers['Cookie'] = auth.cookie;
    const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers });
    const status = res.getResponseCode();
    lines.push(`  HTTP: ${status}`);
    if (status === 200) {
      const item = JSON.parse(res.getContentText())?.quoteResponse?.result?.[0];
      lines.push(item
        ? `  株価=${item.regularMarketPrice}  配当=${item.trailingAnnualDividendRate ?? item.dividendRate ?? 'なし'}`
        : `  result なし: ${res.getContentText().substring(0, 120)}`
      );
    } else {
      lines.push(`  レスポンス: ${res.getContentText().substring(0, 120)}`);
    }
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  // ④ 株価 API（クランブなし・query2）
  lines.push('\n▼ 株価 API / query2（クランブなし）');
  try {
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${testCode}.T`;
    const res = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true,
      headers: { ...BASE_HEADERS, 'Accept': 'application/json' }
    });
    const status = res.getResponseCode();
    lines.push(`  HTTP: ${status}`);
    if (status === 200) {
      const item = JSON.parse(res.getContentText())?.quoteResponse?.result?.[0];
      lines.push(item
        ? `  株価=${item.regularMarketPrice}  配当=${item.trailingAnnualDividendRate ?? item.dividendRate ?? 'なし'}`
        : `  result なし: ${res.getContentText().substring(0, 120)}`
      );
    } else {
      lines.push(`  レスポンス: ${res.getContentText().substring(0, 120)}`);
    }
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  // ⑤ チャート API
  lines.push('\n▼ チャート API / query1 v8');
  try {
    const price = fetchPriceFromYahooChart_(testCode);
    lines.push(price != null ? `  株価: ${price}` : '  取得できず');
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  // ⑥ Stooq
  lines.push('\n▼ Stooq（株価フォールバック）');
  try {
    const price = fetchPriceFromStooq_(testCode);
    lines.push(price != null ? `  株価: ${price}` : '  取得できず');
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  // ⑦ みんかぶ
  lines.push('\n▼ みんかぶ（配当金フォールバック）');
  try {
    const div = fetchDividendFromMinkabu_(testCode);
    lines.push(div != null ? `  配当金: ${div}` : '  取得できず');
  } catch (e) {
    lines.push(`  エラー: ${e.message}`);
  }

  SpreadsheetApp.getUi().alert(lines.join('\n'));
}

/**
 * 表示されている先頭5銘柄だけ更新する（動作確認用）。
 * フィルターで非表示の行はスキップして、可視行5件に達するまで走査する。
 */
function testUpdateFirst5() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const TARGET_VISIBLE = 5;
  const fullRowCount = getActiveRowCount_(sheet);
  let visibleFound = 0;
  let rowsNeeded = fullRowCount;

  for (let i = 0; i < fullRowCount; i++) {
    const row = DATA_START_ROW + i;
    const hidden = sheet.isRowHiddenByFilter(row) || sheet.isRowHiddenByUser(row);
    if (!hidden) {
      visibleFound++;
      if (visibleFound >= TARGET_VISIBLE) {
        rowsNeeded = i + 1;
        break;
      }
    }
  }

  if (visibleFound === 0) {
    SpreadsheetApp.getUi().alert('表示されている行が見つかりません。フィルターを確認してください。');
    return;
  }

  const summary = updateMarketData_({ sheet, updatePrice: true, updateDividend: true, testLimit: rowsNeeded });
  SpreadsheetApp.getUi().alert(
    `【テスト】表示されている先頭${visibleFound}銘柄の更新完了\n` +
    `株価: ${summary.priceUpdated}件\n配当金: ${summary.dividendUpdated}件` +
    (summary.priceUpdated === 0 && summary.dividendUpdated === 0
      ? '\n\n取得できませんでした。実行ログを確認してください。'
      : '')
  );
}

/**
 * 毎朝9:00に自動実行するトリガーを設定する。
 */
function setDailyTrigger() {
  const handlerName = 'dailyUpdate';
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handlerName)
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  SpreadsheetApp.getUi().alert('毎朝9:00に株価・配当金を更新するトリガーを設定しました。');
}

/**
 * トリガーから呼ばれる毎日の自動更新。
 */
function dailyUpdate() {
  const sheet = getTargetSheet_();
  if (!sheet) return;

  const summary = updateMarketData_({ sheet, updatePrice: true, updateDividend: true });
  Logger.log(`dailyUpdate completed: price=${summary.priceUpdated}, dividend=${summary.dividendUpdated}`);
}

/**
 * メニューを追加する。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('高配当株ツール')
    .addItem('初回セットアップ', 'initialSetup')
    .addSeparator()
    .addItem('株価と配当金を更新', 'updateAllMarketData')
    .addItem('株価だけ更新', 'updatePrices')
    .addItem('配当金だけ更新', 'updateDividends')
    .addSeparator()
    .addItem('毎朝9時の自動更新トリガーを設定', 'setDailyTrigger')
    .addSeparator()
    .addItem('【テスト】先頭5銘柄だけ更新', 'testUpdateFirst5')
    .addItem('【診断】接続テスト', 'runDiagnostics')
    .addToUi();
}

/**
 * 株価・配当金の更新本体。
 * testLimit を指定すると先頭 N 行だけ処理する（動作確認用）。
 */
function updateMarketData_({ sheet, updatePrice, updateDividend, testLimit = 0 }) {
  const fullRowCount = getActiveRowCount_(sheet);
  const rowCount = testLimit > 0 ? Math.min(testLimit, fullRowCount) : fullRowCount;
  if (rowCount === 0) {
    return { priceUpdated: 0, dividendUpdated: 0 };
  }

  applyDerivedFormulas_(sheet, rowCount);

  const codeValues = sheet.getRange(DATA_START_ROW, COL_CODE, rowCount, 1).getDisplayValues();
  const rowVisibility = getRowVisibility_(sheet, rowCount);
  const existingPrices = updatePrice
    ? sheet.getRange(DATA_START_ROW, COL_PRICE, rowCount, 1).getValues()
    : null;
  const existingDividends = updateDividend
    ? sheet.getRange(DATA_START_ROW, COL_DIVIDEND, rowCount, 1).getValues()
    : null;

  const validCodes = [];
  for (let i = 0; i < codeValues.length; i++) {
    const code = normalizeCode_(codeValues[i][0]);
    if (code && rowVisibility[i]) validCodes.push(code);
  }

  const quoteMap = fetchQuotes_(validCodes);
  const fallbackStats = { price: 0, dividend: 0 };
  let priceFallbackAttempts = 0;
  let dividendFallbackAttempts = 0;

  let priceUpdated = 0;
  let dividendUpdated = 0;
  const nextPrices = [];
  const nextDividends = [];

  for (let i = 0; i < codeValues.length; i++) {
    const code = normalizeCode_(codeValues[i][0]);
    const isVisible = rowVisibility[i];
    const quote = code && isVisible ? quoteMap[code] : null;

    if (updatePrice) {
      let nextPrice = existingPrices[i][0];
      let price = quote ? quote.price : null;

      if (!isVisible) {
        nextPrices.push([nextPrice]);
      } else {
        if (!isPositiveNumber_(price) && code && priceFallbackAttempts < MAX_PRICE_FALLBACKS) {
          priceFallbackAttempts++;
          price = fetchPriceFallback_(code);
          if (isPositiveNumber_(price)) fallbackStats.price++;
        }

        if (isPositiveNumber_(price)) {
          nextPrice = price;
          priceUpdated++;
        } else if (!code) {
          nextPrice = '';
        }
        nextPrices.push([nextPrice]);
      }
    }

    if (updateDividend) {
      let nextDividend = existingDividends[i][0];
      let dividend = quote ? quote.dividend : null;

      if (!isVisible) {
        nextDividends.push([nextDividend]);
      } else {
        if (!isPositiveNumber_(dividend) && code && dividendFallbackAttempts < MAX_DIVIDEND_FALLBACKS) {
          dividendFallbackAttempts++;
          dividend = fetchDividendFallback_(code);
          if (isPositiveNumber_(dividend)) fallbackStats.dividend++;
        }

        if (isPositiveNumber_(dividend)) {
          nextDividend = dividend;
          dividendUpdated++;
        } else if (!code) {
          nextDividend = '';
        }
        nextDividends.push([nextDividend]);
      }
    }
  }

  if (updatePrice) {
    sheet.getRange(DATA_START_ROW, COL_PRICE, rowCount, 1).setValues(nextPrices);
    sheet.getRange(DATA_START_ROW, COL_PRICE, rowCount, 1).setNumberFormat('#,##0.00');
  }

  if (updateDividend) {
    sheet.getRange(DATA_START_ROW, COL_DIVIDEND, rowCount, 1).setValues(nextDividends);
    sheet.getRange(DATA_START_ROW, COL_DIVIDEND, rowCount, 1).setNumberFormat('#,##0.00');
  }

  sheet.getRange(DATA_START_ROW, COL_TARGET_PRICE, rowCount, 1).setNumberFormat('#,##0.00');
  sheet.getRange(DATA_START_ROW, COL_YIELD, rowCount, 1).setNumberFormat('0.00%');

  Logger.log(
    `updateMarketData_: priceUpdated=${priceUpdated}, dividendUpdated=${dividendUpdated}, ` +
    `fallbackPrice=${fallbackStats.price}, fallbackDividend=${fallbackStats.dividend}, ` +
    `priceFallbackAttempts=${priceFallbackAttempts}, dividendFallbackAttempts=${dividendFallbackAttempts}`
  );

  return { priceUpdated, dividendUpdated };
}

/**
 * AE列（目安株価）とAG列（配当利回り）の式を設定する。
 */
function applyDerivedFormulas_(sheet, rowCount) {
  const targetPriceFormulas = [];
  const yieldFormulas = [];
  const codes = sheet.getRange(DATA_START_ROW, COL_CODE, rowCount, 1).getDisplayValues();
  const rowVisibility = getRowVisibility_(sheet, rowCount);
  const existingTargetPriceFormulas = sheet.getRange(DATA_START_ROW, COL_TARGET_PRICE, rowCount, 1).getFormulas();
  const existingYieldFormulas = sheet.getRange(DATA_START_ROW, COL_YIELD, rowCount, 1).getFormulas();

  for (let i = 0; i < rowCount; i++) {
    const row = DATA_START_ROW + i;
    const code = normalizeCode_(codes[i][0]);
    if (!rowVisibility[i]) {
      targetPriceFormulas.push([existingTargetPriceFormulas[i][0]]);
      yieldFormulas.push([existingYieldFormulas[i][0]]);
      continue;
    }

    targetPriceFormulas.push([code
      ? `=IFERROR(IF(AND(ISNUMBER(AD${row}),ISNUMBER(Y${row}),Y${row}>0),AD${row}/(Y${row}/100),""),"")`
      : ''
    ]);
    yieldFormulas.push([code
      ? `=IFERROR(IF(AND(ISNUMBER(AD${row}),ISNUMBER(AF${row}),AF${row}>0),AD${row}/AF${row},""),"")`
      : ''
    ]);
  }

  sheet.getRange(DATA_START_ROW, COL_TARGET_PRICE, rowCount, 1).setFormulas(targetPriceFormulas);
  sheet.getRange(DATA_START_ROW, COL_YIELD, rowCount, 1).setFormulas(yieldFormulas);
}

// ============================================================
//  Yahoo Finance クランブ認証
//  2024年以降、Yahoo Finance API はクランブ必須になった。
//  CacheService で 30 分キャッシュして繰り返し取得を防ぐ。
// ============================================================

/**
 * Yahoo Finance のクランブ（認証トークン）とクッキーを取得する。
 * 取得に失敗した場合は null を返す。
 */
function getYahooCrumb_() {
  const cache = CacheService.getScriptCache();
  const cachedCrumb = cache.get('yahoo_crumb');
  const cachedCookie = cache.get('yahoo_cookie');
  if (cachedCrumb && cachedCookie) {
    Logger.log('Using cached Yahoo crumb');
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  try {
    // Step 1: Yahoo Finance にアクセスしてセッションクッキーを取得
    const initResponse = UrlFetchApp.fetch('https://finance.yahoo.com/', {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        ...BASE_HEADERS,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const allHeaders = initResponse.getAllHeaders();
    const setCookieHeader = allHeaders['Set-Cookie'] || allHeaders['set-cookie'] || [];
    const cookiesArr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    const cookieStr = cookiesArr
      .filter(Boolean)
      .map(c => c.split(';')[0].trim())
      .join('; ');

    if (!cookieStr) {
      Logger.log('Yahoo Finance: no cookies received');
      return null;
    }

    // Step 2: クランブエンドポイントから認証トークンを取得
    const crumbResponse = UrlFetchApp.fetch(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
      {
        method: 'get',
        muteHttpExceptions: true,
        headers: {
          ...BASE_HEADERS,
          'Accept': 'text/plain, */*',
          'Cookie': cookieStr
        }
      }
    );

    if (crumbResponse.getResponseCode() !== 200) {
      Logger.log(`Crumb fetch failed: HTTP ${crumbResponse.getResponseCode()}`);
      return null;
    }

    const crumb = crumbResponse.getContentText().trim();
    if (!crumb || crumb.startsWith('<') || crumb === 'Unauthorized') {
      Logger.log(`Invalid crumb: ${crumb.substring(0, 100)}`);
      return null;
    }

    // 30 分キャッシュ
    cache.put('yahoo_crumb', crumb, 1800);
    cache.put('yahoo_cookie', cookieStr, 1800);
    Logger.log('Yahoo crumb obtained successfully');
    return { crumb, cookie: cookieStr };

  } catch (error) {
    Logger.log(`getYahooCrumb_ error: ${error.message}`);
    return null;
  }
}

// ============================================================
//  データ取得（メイン・フォールバック）
// ============================================================

/**
 * Yahoo Finance から株価・配当金をバッチ取得する（クランブ認証対応）。
 */
function fetchQuotes_(codes) {
  const quoteMap = {};
  if (!codes.length) return quoteMap;

  const uniqueCodes = [...new Set(codes)];
  const auth = getYahooCrumb_();

  for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
    const batch = uniqueCodes.slice(i, i + BATCH_SIZE);
    const symbols = batch.map(code => `${code}.T`).join(',');
    const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}${crumbParam}`;

    const headers = { ...BASE_HEADERS, 'Accept': 'application/json' };
    if (auth) headers['Cookie'] = auth.cookie;

    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        muteHttpExceptions: true,
        headers
      });

      const responseCode = response.getResponseCode();

      // 認証エラーの場合はキャッシュをクリア（次回再取得）
      if (responseCode === 401 || responseCode === 403) {
        Logger.log(`Yahoo Finance auth error: HTTP ${responseCode} — crumb cache cleared`);
        CacheService.getScriptCache().removeAll(['yahoo_crumb', 'yahoo_cookie']);
        continue;
      }
      if (responseCode !== 200) {
        Logger.log(`Yahoo Finance API error: HTTP ${responseCode} for ${symbols}`);
        continue;
      }

      const data = JSON.parse(response.getContentText());
      const results = data?.quoteResponse?.result ?? [];

      results.forEach(item => {
        const code = normalizeCode_(String(item.symbol || '').replace(/\.T$/i, ''));
        if (!code) return;

        const price = pickFirstPositiveNumber_([
          item.regularMarketPrice,
          item.bid,
          item.ask
        ]);

        const dividend = pickFirstPositiveNumber_([
          item.trailingAnnualDividendRate,
          item.dividendRate
        ]);

        quoteMap[code] = { price, dividend };
      });

      Logger.log(`Yahoo batch: requested=${batch.length}, received=${results.length}`);
    } catch (error) {
      Logger.log(`Yahoo Finance fetch failed: ${error.message}`);
    }

    if (i + BATCH_SIZE < uniqueCodes.length) {
      Utilities.sleep(500);
    }
  }

  return quoteMap;
}

function fetchPriceFallback_(code) {
  const fromChart = fetchPriceFromYahooChart_(code);
  if (isPositiveNumber_(fromChart)) return fromChart;

  const fromStooq = fetchPriceFromStooq_(code);
  if (isPositiveNumber_(fromStooq)) return fromStooq;

  return null;
}

function fetchDividendFallback_(code) {
  // 1. Yahoo Finance 個別クエリ（クランブ認証付き）
  const fromYahooQuote = fetchDividendFromYahooQuote_(code);
  if (isPositiveNumber_(fromYahooQuote)) return fromYahooQuote;

  // 2. みんかぶ（かぶたんが取れない場合の代替）
  const fromMinkabu = fetchDividendFromMinkabu_(code);
  if (isPositiveNumber_(fromMinkabu)) return fromMinkabu;

  // 3. かぶたん
  const fromKabutan = fetchDividendFromKabutan_(code);
  if (isPositiveNumber_(fromKabutan)) return fromKabutan;

  return null;
}

/**
 * Yahoo Finance v8 チャート API から株価を取得（クランブ認証対応）。
 */
function fetchPriceFromYahooChart_(code) {
  const cache = CacheService.getScriptCache();
  const cachedCrumb = cache.get('yahoo_crumb');
  const cachedCookie = cache.get('yahoo_cookie');

  const crumbParam = cachedCrumb ? `&crumb=${encodeURIComponent(cachedCrumb)}` : '';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.T?interval=1d&range=5d${crumbParam}`;

  const headers = { ...BASE_HEADERS, 'Accept': 'application/json' };
  if (cachedCookie) headers['Cookie'] = cachedCookie;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers
    });
    if (response.getResponseCode() !== 200) return null;

    const data = JSON.parse(response.getContentText());
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const metaPrice = Number(result.meta?.regularMarketPrice);
    if (!isNaN(metaPrice) && metaPrice > 0) return metaPrice;

    const closes = result.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i--) {
      const price = Number(closes[i]);
      if (!isNaN(price) && price > 0) return price;
    }
  } catch (error) {
    Logger.log(`Yahoo chart fallback failed (${code}): ${error.message}`);
  }

  return null;
}

function fetchPriceFromStooq_(code) {
  const paddedCode = String(code).padStart(4, '0');
  const url = `https://stooq.com/q/l/?s=${paddedCode}.jp&f=c&e=csv`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/csv,text/plain,*/*'
      }
    });
    if (response.getResponseCode() !== 200) return null;

    const lines = response.getContentText('UTF-8').trim().split('\n');
    if (lines.length < 2) return null;

    const cols = lines[1].split(',');
    const price = Number(cols[cols.length - 1]);
    return !isNaN(price) && price > 0 ? price : null;
  } catch (error) {
    Logger.log(`stooq fallback failed (${code}): ${error.message}`);
    return null;
  }
}

/**
 * Yahoo Finance 個別クエリで配当金を取得（クランブ認証対応）。
 */
function fetchDividendFromYahooQuote_(code) {
  const cache = CacheService.getScriptCache();
  const cachedCrumb = cache.get('yahoo_crumb');
  const cachedCookie = cache.get('yahoo_cookie');

  const crumbParam = cachedCrumb ? `&crumb=${encodeURIComponent(cachedCrumb)}` : '';
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${code}.T${crumbParam}`;

  const headers = { ...BASE_HEADERS, 'Accept': 'application/json' };
  if (cachedCookie) headers['Cookie'] = cachedCookie;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers
    });
    if (response.getResponseCode() !== 200) return null;

    const data = JSON.parse(response.getContentText());
    const item = data?.quoteResponse?.result?.[0];
    if (!item) return null;

    return pickFirstPositiveNumber_([
      item.trailingAnnualDividendRate,
      item.dividendRate
    ]);
  } catch (error) {
    Logger.log(`Yahoo dividend fallback failed (${code}): ${error.message}`);
    return null;
  }
}

/**
 * みんかぶから年間配当金を取得する。
 */
function fetchDividendFromMinkabu_(code) {
  const paddedCode = String(code).padStart(4, '0');
  const url = `https://minkabu.jp/stock/${paddedCode}/dividend`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (response.getResponseCode() !== 200) return null;

    const html = response.getContentText('UTF-8');

    // 複数パターンで年間配当合計を探す
    const patterns = [
      /合計[\s\S]{0,30}?>([\d,]+(?:\.\d+)?)<\/td>/,
      /年間配当[^0-9]{0,30}([\d,]+(?:\.\d+)?)/,
      /"annualDividend"\s*:\s*"?([\d.]+)"?/,
      /配当金合計[^0-9]{0,30}([\d,]+(?:\.\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const value = Number(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          Logger.log(`Minkabu dividend found (${code}): ${value}`);
          return value;
        }
      }
    }
  } catch (error) {
    Logger.log(`Minkabu dividend failed (${code}): ${error.message}`);
  }
  return null;
}

/**
 * かぶたんから配当金を取得する。
 */
function fetchDividendFromKabutan_(code) {
  const url = `https://kabutan.jp/stock/?code=${code}`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (response.getResponseCode() !== 200) return null;

    const html = response.getContentText('UTF-8');
    const matches = [
      html.match(/予<\/td>[\s\S]{0,400}?<td[^>]*>([\d.]+)<\/td>\s*<td[^>]*>\d{2}\/\d{2}\/\d{2}<\/td>/),
      html.match(/年間配当[^0-9]{0,20}([\d,]+(?:\.\d+)?)/),
      html.match(/一株配当[^0-9]{0,20}([\d,]+(?:\.\d+)?)/)
    ];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (!match || !match[1]) continue;
      const value = Number(String(match[1]).replace(/,/g, ''));
      if (!isNaN(value) && value > 0) return value;
    }
  } catch (error) {
    Logger.log(`Kabutan dividend fallback failed (${code}): ${error.message}`);
  }

  return null;
}

// ============================================================
//  ユーティリティ
// ============================================================

function getTargetSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`「${SHEET_NAME}」シートが見つかりません。`);
    return null;
  }
  return sheet;
}

function getRowCount_(sheet) {
  const lastRow = sheet.getLastRow();
  return Math.max(0, lastRow - DATA_START_ROW + 1);
}

function getActiveRowCount_(sheet) {
  const lastDataRow = getLastDataRowByCode_(sheet);
  return lastDataRow < DATA_START_ROW ? 0 : lastDataRow - DATA_START_ROW + 1;
}

function getLastDataRowByCode_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return DATA_START_ROW - 1;

  const values = sheet.getRange(DATA_START_ROW, COL_CODE, lastRow - DATA_START_ROW + 1, 1).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (normalizeCode_(values[i][0])) {
      return DATA_START_ROW + i;
    }
  }
  return DATA_START_ROW - 1;
}

function getRowVisibility_(sheet, rowCount) {
  const visibility = [];
  for (let i = 0; i < rowCount; i++) {
    const row = DATA_START_ROW + i;
    visibility.push(!sheet.isRowHiddenByFilter(row) && !sheet.isRowHiddenByUser(row));
  }
  return visibility;
}

function normalizeCode_(value) {
  const normalized = String(value == null ? '' : value).trim().replace(/\.0$/, '');
  return /^\d{4}$/.test(normalized) ? normalized : null;
}

function isPositiveNumber_(value) {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

function pickFirstPositiveNumber_(values) {
  for (let i = 0; i < values.length; i++) {
    const num = Number(values[i]);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  return null;
}

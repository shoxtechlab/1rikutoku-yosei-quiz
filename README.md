# 一陸特 基礎確認テスト

第一級陸上特殊無線技士の養成課程向けの非公式な学習アプリです。問題は独自作成で、実際の修了試験問題の再現ではありません。

公開ページは [GitHub Pages](https://shoxtechlab.github.io/1rikutoku-yosei-quiz/) で、2026年11月22日まで公開予定です。

- ランダム30問（無線工学20問・法規10問）と、科目別の全問演習
- ヒントと詳しい解説付きの「無線工学・やさしい20問」（別バンク `questions-easy.json` から出題）
- 各問の答え合わせ・解説、分野別正答率、誤答の復習

## 使い方

Pythonが入った環境で、このフォルダーから次のコマンドを実行し、ブラウザで [http://localhost:8000](http://localhost:8000) を開きます。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

問題データは `questions.json` にあります。Node.jsで `node test.mjs` を実行すると、問題データとJavaScriptの構文を検証できます。

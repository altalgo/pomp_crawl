const express = require('express');
const app = express();
const body = require('body-parser');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cheerio = require("cheerio");
const axios = require('axios');

try {
    const option = {
        cert: fs.readFileSync("/home/ubuntu/docker/etc/phpmyadmin/phpmyadmin/ssl/fullchain.pem"),
        key: fs.readFileSync("/home/ubuntu/docker/etc/phpmyadmin/phpmyadmin/ssl/privkey.pem")
    }
    const server = https.createServer(option, app).listen(3003, () => {
        console.log('server has started');
    })
} catch (err) {
    console.error(err);
}

app.use(cors());
app.use(body.json({
    limit: "10mb"
}));
app.use(body.urlencoded({
    limit: "10mb",
    extended: true
}));

app.use('/get', (req, res) => {
    console.log('received')
    let resultJSON = "";
    Object.values(req.body).map((val, idx) => {
        let ret = {
            session: "",
            data: [
        
            ]
        }
        // console.log(val)
        const $ = cheerio.load(val)
        let $head = $('.freebirdFormviewerViewNoPadding');
        $head = $head.find('.freebirdFormviewerViewHeaderHeader')
        let title = $head.find('.freebirdFormviewerViewHeaderTitleRow').find('.freebirdFormviewerViewHeaderTitle').text()
        // console.log(title)
        let desc = $head.find('.freebirdFormviewerViewHeaderDescription').text();
        ret.data[0] = { title, desc, type: -1 };

        const $body = $('.freebirdFormviewerViewNumberedItemContainer');
        // console.log($($body[0]).html());
        
        $body.each((idx, ele) => {
            (function () {
                ret.data[idx + 1] = {
                    title: $(ele).find('.freebirdFormviewerComponentsQuestionBaseTitle').text(),
                    desc: $(ele).find('.freebirdFormviewerComponentsQuestionBaseDescription').text(),
                    imgUrl: $(ele).find('.freebirdFormviewerViewItemsEmbeddedobjectImageWrapper').find('img').attr('src')
                }
            }());

            let obj = $(ele).children().children().children();
            obj.each((idx1, elem) => {
                let className = $(elem).attr('class');
                console.log(idx, idx1, className);
                if (className == "freebirdFormviewerComponentsQuestionTextRoot") {
                    // 단답형
                    ret.data[idx + 1].type = 0;
                    ret.data[idx + 1].list = "";
                    ret.data[idx + 1].ans = "";

                    if ($(ele).find('input').length != 0) {
                        ret.data[idx + 1].type = 0;
                        ret.data[idx + 1].ans = $(ele).find('input').attr('data-initial-value');
                    } else if ($(ele).find('textarea').length != 0) {
                        // 장문형
                        ret.data[idx + 1].type = 1;
                        ret.data[idx + 1].ans = $(ele).find('textarea').attr('data-initial-value');
                    }
                } else if (className == "freebirdFormviewerComponentsQuestionRadioRoot") {
                    // 객관식 Radio
                    let isChecked;
                    let lst = [];
                    $(ele).find('label').each((idx, elem) => {
                        if ($(elem).hasClass('isChecked')) {
                            isChecked = $(elem).text();
                            lst.push($(elem).text())
                        } else {
                            lst.push($(elem).text())
                            // console.log($(elem).text() + "를 선택하지 않음");
                        }
                    });
                    ret.data[idx + 1].type = 2;
                    ret.data[idx + 1].list = lst;
                    ret.data[idx + 1].ans = isChecked;
                } else if (className == "freebirdFormviewerComponentsQuestionCheckboxRoot") {
                    console.log('checkbox');
                    // 체크박스
                    let isChecked = [];
                    let lst = [];
                    $(ele).find('label').each((idx, elem) => {
                        if ($(elem).hasClass('isChecked')) {
                            isChecked.push($(elem).text())
                            lst.push($(elem).text());
                        } else {
                            lst.push($(elem).text());
                        }
                    });

                    ret.data[idx + 1].type = 3;
                    ret.data[idx + 1].list = lst;
                    ret.data[idx + 1].ans = isChecked;
                } else if (className == "freebirdFormviewerComponentsQuestionSelectRoot") {
                    // 드롭다운
                    let isChecked;
                    let lst = [];
                    $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                        if ($(elem).text() == "선택");
                        else if ($(elem).attr('aria-selected') == "true") {
                            isChecked = $(elem).text();
                            lst.push($(elem).text())
                        } else {
                            lst.push($(elem).text())
                        }
                    });

                    ret.data[idx + 1].type = 4;
                    ret.data[idx + 1].list = lst;
                    ret.data[idx + 1].ans = isChecked;
                } else if (className == "freebirdFormviewerComponentsQuestionScaleRoot") {
                    // 직선단계
                    let isChecked;
                    let lst = [];
                    $(ele).find('.appsMaterialWizToggleRadiogroupEl').each((idx, elem) => {
                        if ($(elem).attr('aria-checked') == "false") {
                            lst.push($(elem).attr('data-value'))
                        } else {
                            lst.push($(elem).attr('data-value'))
                            isChecked = $(elem).attr('data-value');
                        }
                    });

                    ret.data[idx + 1].type = 5;
                    ret.data[idx + 1].list = lst;
                    ret.data[idx + 1].ans = isChecked;
                } else if (className == "freebirdFormviewerComponentsQuestionGridRoot") {
                    let hang = []
                    let ryul = []
                    let isChecked;
                    let chk = 0;
                    if ($(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').length != 0) {
                        // 객관식 그리드 6
                        let hangCnt = $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').length;
                        let ryulCnt = $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').find('.freebirdFormviewerComponentsQuestionGridCell').length / hangCnt - 1;
                        isChecked = new Array(hangCnt)
                        for (let i = 0; i < hangCnt; i++) {
                            isChecked[i] = new Array(ryulCnt);
                        }
                        // console.log(isChecked)
                        $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .appsMaterialWizToggleRadiogroupGroupContainer .appsMaterialWizToggleRadiogroupGroupContent').each((idx1, elem) => {
                            $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                                if (idx == 0) {
                                    hang.push($(elemt).text())
                                } else {
                                    if (idx1 == 0)
                                        ryul.push($(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('data-value'))
                                    if ($(elemt).find('.appsMaterialWizToggleRadiogroupEl').attr('aria-checked') == "true") {
                                        isChecked[idx1][idx - 1] = 1;
                                    }
                                }
                            })
                        })
                    } else {
                        // 체크박스 그리드 7
                        let hangCnt = $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .freebirdFormviewerComponentsQuestionGridCheckboxGroup').length;
                        let ryulCnt = $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .freebirdFormviewerComponentsQuestionGridCheckboxGroup').find('.freebirdFormviewerComponentsQuestionGridCell').length / hangCnt - 1;
                        isChecked = new Array(hangCnt)
                        for (let i = 0; i < hangCnt; i++) {
                            isChecked[i] = new Array(ryulCnt);
                        }
                        $(ele).find('.freebirdFormviewerComponentsQuestionGridScrollContainer .freebirdFormviewerComponentsQuestionGridCheckboxGroup').each((idx1, elem) => {
                            chk = 1;
                            $(elem).find('.freebirdFormviewerComponentsQuestionGridCell').each((idx, elemt) => {
                                if (idx == 0) {
                                    hang.push($(elemt).text())
                                } else {
                                    if (idx1 == 0)
                                        ryul.push($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('data-answer-value'))
                                    if ($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('aria-checked') == "true") {
                                        isChecked[idx1][idx - 1] = 1;
                                    }
                                }
                            })
                        })
                    }
                    if (chk == 1) {
                        ret.data[idx + 1].type = 7;
                    } else {
                        ret.data[idx + 1].type = 6;
                    };
                    ret.data[idx + 1].list = { hang, ryul };
                    ret.data[idx + 1].ans = isChecked;
                } else if (className == undefined) {
                    // 날짜
                    ret.data[idx + 1].type = 8;
                    ret.data[idx + 1].list = "";
                    ret.data[idx + 1].ans = $(ele).find('input').attr('data-initial-value');
                } else if (className == "freebirdFormviewerComponentsQuestionTimeRoot") {
                    // 시간
                    let str = "";
                    $(ele).find('input').each((idx, elem) => {
                        if (idx == 0) {
                            str = $(elem).attr('data-initial-value');
                        } else {
                            str += " : " + $(elem).attr('data-initial-value');
                        }
                    })
                    $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                        if ($(elem).attr('aria-selected') == "true") {
                            str += " " + $(elem).attr('data-value');
                        }
                    });
                    ret.data[idx + 1].type = 9;
                    ret.data[idx + 1].list = "";
                    ret.data[idx + 1].ans = str;
                } else {
                    // 사진 걸러내야댐 ..
                    // console.log(className)
                }
            });
        })
        // console.log(ret)
        resultJSON += JSON.stringify(ret)
        fs.writeFileSync('./val.html', val);
        fs.writeFileSync('./val.json', JSON.stringify(ret));
    })
    // console.log(resultJSON)
    fs.writeFileSync('./txt.json', resultJSON);
})
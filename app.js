const express = require('express');
const app = express();
const body = require('body-parser');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cheerio = require("cheerio");
const axios = require('axios');
const mysql2 = require('mysql2');
const dotenv = require('dotenv');

dotenv.config(); // .env파일로 환경변수 적용

const connection = mysql2.createPool({
    host: process.env.MYSQL2_HOST,
    user: process.env.MYSQL2_USER,
    password: process.env.MYSQL2_PW,
    database: process.env.MYSQL2_DB
});


// SSL 설정
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

// CORS 설정
app.use(cors());

// POST 크기 제한 상향
app.use(body.json({
    limit: "10mb"
}));
app.use(body.urlencoded({
    limit: "10mb",
    extended: true
}));


// EXTENSION에서 POST 받아옴
app.use('/get', (req, res) => {
    // console.log(req.body);
    let ret = {
        session: "",
        data: [

        ]
    }
    let idx = 0;

    // 섹션 map
    Object.values(req.body.question).map((val, idx2) => {
        const $ = cheerio.load(val)
        let $head = $('.freebirdFormviewerViewNoPadding');
        $head = $head.find('.freebirdFormviewerViewHeaderHeader')
        let title = $head.find('.freebirdFormviewerViewHeaderTitleRow').find('.freebirdFormviewerViewHeaderTitle').text()
        let desc = $head.find('.freebirdFormviewerViewHeaderDescription').text();

        // 폼 타이틀 지정
        if (title != "")
            ret.data[0] = { title, desc, type: -1 };

        // 섹션 내 질문 container map
        const $body = $('.freebirdFormviewerViewNumberedItemContainer');
        $body.each((idx3, ele) => {
            (function () {
                ret.data[idx + 1] = {
                    title: $(ele).find('.freebirdFormviewerComponentsQuestionBaseTitle').text(),
                    desc: $(ele).find('.freebirdFormviewerComponentsQuestionBaseDescription').text(),
                    imgUrl: $(ele).find('.freebirdFormviewerViewItemsEmbeddedobjectImageWrapper').find('img').attr('src')
                }
            }());

            let obj = $(ele).children().children().children();
            let sectionTitleContainer = false;
            let sectionTitle, sectionDesc;
            if (obj.length === 0) {
                let tmpEle = $(ele).children().children();
                tmpEle.each((idx1, elem) => {
                    console.log($(elem).attr('class'))
                    if ($(elem).hasClass("freebirdFormviewerViewItemsSectionheaderTitle")) {
                        sectionTitleContainer = true;
                        sectionTitle = $(elem).text();
                    } else if ($(elem).hasClass("freebirdFormviewerViewItemsSectionheaderDescriptionText")) {
                        sectionTitleContainer = true;
                        sectionDesc = $(elem).text();
                    }
                })
                if (sectionTitleContainer) {
                    ret.data[idx + 1] = {
                        title: sectionTitle,
                        desc: sectionDesc,
                        type: 11
                    }
                }
            }
            obj.each((idx1, elem) => {
                let className = $(elem).attr('class');
                // console.log(idx, idx1, className);
                if (className === "freebirdFormviewerComponentsQuestionTextRoot") {
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
                } else if (className === "freebirdFormviewerComponentsQuestionRadioRoot") {
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
                } else if (className === "freebirdFormviewerComponentsQuestionCheckboxRoot") {
                    // console.log('checkbox');
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
                } else if (className === "freebirdFormviewerComponentsQuestionSelectRoot") {
                    // 드롭다운
                    let isChecked;
                    let lst = [];
                    $(ele).find('.quantumWizMenuPaperselectOption').each((idx, elem) => {
                        if ($(elem).text() == "선택");
                        else if ($(elem).attr('aria-selected') === "true") {
                            isChecked = $(elem).text();
                            lst.push($(elem).text())
                        } else {
                            lst.push($(elem).text())
                        }
                    });

                    ret.data[idx + 1].type = 4;
                    ret.data[idx + 1].list = lst;
                    ret.data[idx + 1].ans = isChecked;
                } else if (className === "freebirdFormviewerComponentsQuestionScaleRoot") {
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
                } else if (className === "freebirdFormviewerComponentsQuestionGridRoot") {
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
                                if (idx === 0) {
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
                                if (idx === 0) {
                                    hang.push($(elemt).text())
                                } else {
                                    if (idx1 === 0)
                                        ryul.push($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('data-answer-value'))
                                    if ($(elemt).find('.quantumWizTogglePapercheckboxEl').attr('aria-checked') == "true") {
                                        isChecked[idx1][idx - 1] = 1;
                                    }
                                }
                            })
                        })
                    }
                    if (chk === 1) {
                        ret.data[idx + 1].type = 7;
                    } else {
                        ret.data[idx + 1].type = 6;
                    };
                    ret.data[idx + 1].list = { hang, ryul };
                    ret.data[idx + 1].ans = isChecked;
                } else if (className === undefined) {
                    // 날짜
                    ret.data[idx + 1].type = 8;
                    ret.data[idx + 1].list = "";
                    ret.data[idx + 1].ans = $(ele).find('input').attr('data-initial-value');
                } else if (className === "freebirdFormviewerComponentsQuestionTimeRoot") {
                    // 시간
                    let str = "";
                    $(ele).find('input').each((idx, elem) => {
                        if (idx === 0) {
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
                } else if (className === "freebirdFormviewerViewItemsEmbeddedobjectImageWrapper") {
                    ret.data[idx + 1] = {
                        title: $(ele).find('.freebirdFormviewerViewItemsItemItemTitle').text(),
                        imgUrl: $(elem).find('img').attr('src'),
                        type: 10
                    }
                } else if (className === "freebirdFormviewerViewItemsVideoVideo") {
                    // https://www.youtube.com/watch?v=In-OjOIShIs
                    let href = $(elem).attr('src');
                    ret.data[idx + 1].ans = href;
                    ret.data[idx + 1].desc = $(elem).next().text();
                    ret.data[idx + 1].type = 12;
                } else {
                    // 사진 걸러내야댐 ..
                    console.log(className)
                }
            });
            idx += 1;
        })
    })
    connection.query('SELECT * FROM users WHERE userUUID = ?', [req.body.uuid], (err, result, fields) => {
        if (err)
            console.error(err);
        else {
            if (result[0]) { // user가 존재한다면
                connection.query('INSERT INTO forms(userId, session, data, createdAt, updatedAt) VALUES(?,?,?,?,?)', [result[0].id, req.body.uuid, JSON.stringify(ret.data), new Date(), new Date()], (err2, result2, fields2) => {
                    if (err2)
                        console.error(err2);
                    else {
                        console.log('successfully inserted');
                    }
                });
                console.log(result[0])
            } else {
                console.log('no uuid');
            }
        }
    })
    fs.writeFileSync('./txt.json', JSON.stringify(ret));
})
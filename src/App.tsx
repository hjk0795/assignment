/**
 * Author: Hongju Kim
 * Date: 28/03/2024
 * Description: Displaying comments data in the table.
 */

import './App.css';
import { useEffect, useState } from 'react';
import { Input, Table, Alert, message, Empty } from 'antd';
import type { GetProp, TableProps } from 'antd';
import qs from 'qs';
import Modal from './components/Modal';
import type { SearchProps } from 'antd/es/input/Search';
import type { Comment } from './types';

type ColumnsType<T> = TableProps<T>['columns'];
type TablePaginationConfig = Exclude<GetProp<TableProps, 'pagination'>, boolean>;

interface TableParams {
    isSearch: boolean;
    pagination?: TablePaginationConfig;
    sortField?: string;
    sortOrder?: string;
    filters?: Parameters<GetProp<TableProps, 'onChange'>>[1];
}

function truncateString(str: string, maxLength: number) {
    if (str.length > maxLength) {
        return str.slice(0, maxLength).trimEnd() + '...';
    } else {
        return str;
    }
}

const { Search } = Input;

const columns: ColumnsType<Comment> = [
    {
        title: 'Id',
        dataIndex: 'id',
        sorter: true,
        width: '5%',
    },
    {
        title: 'Name',
        dataIndex: 'name',
        width: '20%',
        render: (name) => `${truncateString(name, 30)}`,
    },
    {
        title: 'Email',
        dataIndex: 'email',
        width: '15%',
        render: (email) => `${truncateString(email, 30)}`,
    },
    {
        title: 'Body',
        dataIndex: 'body',
        width: '60%',
        render: (body) => `${truncateString(body, 200)}`,
    },
];

const getCommentsParams = (params: TableParams) => {
    const order = (params as { order?: "ascend" | "descend" }).order;
    let _start = 0;
    let _end = 0;

    // Calculate _start and _end based on current page, pageSize, and total data count.
    if (order === "descend") {
        _end = params.pagination?.total! - ((params.pagination?.current! - 1) * params.pagination?.pageSize!);
        _start = _end - params.pagination?.pageSize!;
    } else {
        _start = (params.pagination?.current! - 1) * params.pagination?.pageSize!;
        _end = _start + params.pagination?.pageSize!;
    }

    return {
        _start,
        _end,
        ...params,
    };
};

function App() {
    /***************************************
     * HOOKS & HANDLERS
     **************************************/
    const [data, setData] = useState<Comment[]>();
    const [loading, setLoading] = useState<boolean>(false);
    const [tableParams, setTableParams] = useState<TableParams>({
        isSearch: false,
        pagination: {
            current: 1,
            pageSize: 5,
        },
    });
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
    const [emailSearchText, setEmailSearchText] = useState<string>('');
    const [isEmailSearchTextValid, setIsEmailSearchTextValid] = useState<boolean>(true);
    const [messageApi, contextHolder] = message.useMessage();
    const onSearch: SearchProps['onSearch'] = (value, _e, info) => {
        // Validation for the input in the email search feature.
        if (info?.source === "input") {
            let emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

            if (!emailRegex.test(value)) {
                setIsEmailSearchTextValid(false);
                return;
            }
        }

        if (!isEmailSearchTextValid) {
            setIsEmailSearchTextValid(true);
        }

        setEmailSearchText(value);
        setTableParams({
            isSearch: true,
            pagination: {
                current: 1,
                pageSize: 5,
            },
        });
    }

    const fetchData = () => {
        setLoading(true);

        const query = emailSearchText !== '' ? `email=${encodeURIComponent(emailSearchText)}` : qs.stringify(getCommentsParams(tableParams));
        fetch(`https://jsonplaceholder.typicode.com/comments?${query}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Network response was not ok, status: ${res.status}`);
                }

                const totalCount = parseInt(res.headers.get('X-Total-Count')!, 10);

                return res.json().then(data => ({
                    data,
                    totalCount,
                }));
            })
            .then(({ data, totalCount }) => {
                if ((tableParams as any).order === "descend") {
                    data.sort((a: { id: number; }, b: { id: number; }) => b.id - a.id);
                }

                setData(data);
                setLoading(false);
                setTableParams(prevTableParams => ({
                    ...prevTableParams,
                    pagination: {
                        ...prevTableParams.pagination,
                        total: totalCount,
                    },
                }));
            })
            .catch(error => {
                console.error("An error occurred.", error);
                setLoading(false);

                messageApi.open({
                    type: 'error',
                    content: 'Something went wrong.',
                });
            });
    };

    useEffect(() => {
        fetchData();
    }, [JSON.stringify(tableParams)]); // JSON stringified to prevent shallow update.

    const handleTableChange: TableProps['onChange'] = (pagination, filters, sorter) => {
        setTableParams({
            isSearch: false,
            pagination,
            filters,
            ...sorter,
        });

        if (pagination.pageSize !== tableParams.pagination?.pageSize) {
            setData([]);
        }

        if (!isEmailSearchTextValid) {
            setIsEmailSearchTextValid(true);
        }
    };

    /***************************************
     * RENDER
     **************************************/
    return <div className="App">
        {contextHolder}
        {data === undefined || data?.length === 0 ? <Empty /> : <div className='tableContainer'>
            {!isEmailSearchTextValid && <Alert className="alert" message="Please enter the valid email" type="error" showIcon />}
            <Search
                className="search"
                placeholder="Search by email"
                allowClear
                enterButton
                size="large"
                onSearch={onSearch}
                status={isEmailSearchTextValid ? '' : 'error'}
            />

            <Table
                className="table"
                columns={columns}
                rowKey={(record) => record.id}
                dataSource={data}
                pagination={tableParams.pagination}
                loading={loading}
                onChange={handleTableChange}
                onRow={(record, rowIndex) => {
                    return {
                        onMouseEnter: event => { event.currentTarget.style.cursor = 'pointer'; },
                        onMouseLeave: event => { event.currentTarget.style.cursor = 'default'; },
                        onClick: event => {
                            setSelectedComment(record);
                            setIsModalVisible(true);
                        },
                    };
                }}
                scroll={{ x: 375, y: 667 }}
            />
            <Modal
                comment={selectedComment}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => setIsModalVisible(false)}
            />
        </div>}

    </div>;
}

export default App;
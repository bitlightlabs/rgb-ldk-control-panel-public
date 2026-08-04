import type { SwapInfo } from "@/lib/sdk/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import SwapItem from "@/app/components/activities/Swap";


const SWAP_PAGE_SIZE = 10
const getDataByPageAndStatus = (list: SwapInfo[], page: number, pageSize: number, status: string) => {
  const filteredList = status === 'All Status'
    ? list
    : list.filter((item) => item.status === status);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const result = filteredList.slice(startIndex, endIndex);

  return {
    hasMore: endIndex < filteredList.length,
    data: result
  }
}

export function SwapList(props: {filterType: string, list: SwapInfo[], contracts: any[], onRefresh: () => void}) {
  const { list, contracts } = props;
  const [page, setPage] = useState<number>(1);
  const [pageList, setPageList] = useState<SwapInfo[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const loadPage = (page: number) => {
    const { data, hasMore } = getDataByPageAndStatus(list, page, SWAP_PAGE_SIZE, props.filterType);
    const all = page === 1 ? data : pageList.concat(data);
    setPageList(all);
    setHasMore(hasMore);
    setPage(page);
  }

  const loadMore = () => {
    const nextPage = page + 1;
    loadPage(nextPage);
  }

  useEffect(() => {
    loadPage(1);
  }, [list, props.filterType]);


  const group = groupByDate(pageList);
  const elements = []
  for(const time in group) {
    elements.push(<SwapTime time={time} />)

    for(let i=0; i<group[time].length; i++) {
      elements.push(
        <SwapItem
          key={group[time][i].payment_hash}
          contracts={contracts}
          data={group[time][i]}
          onRefresh={props.onRefresh}
        />
      )
    }
  }

  if(hasMore) {
    elements.push(
      <div key="more" className="flex mt-4 justify-center">
        <Button
          variant="ghost"
          className="w-[104px] h-10 rounded-full text-base font-[400]"
          onClick={loadMore}
        >
          Load More
        </Button>
      </div>
    )
  }

  return elements;
}

function SwapTime(props: {time: string}) {
  return <div className="h-4 my-4 px-3 text-secondary-foreground text-2xs">{props.time}</div>
}

const groupByDate = (list: SwapInfo[]) => {
  const groups: { [t: string]: SwapInfo[] } = {};
  list.forEach((item) => {
    const date = new Date(Number(item.created_at_unix_secs || '0') * 1000);
    const dateString = date.toLocaleDateString();
    if (!groups[dateString]) {
      groups[dateString] = [];
    }
    groups[dateString].push(item);
  });

  return groups;
}

import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  SimpleGrid,
  Flex,
  Text,
  Icon,
  Badge,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  Progress,
  Tag,
  TagLabel,
  InputGroup,
  InputLeftElement,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import IconBox from 'components/icons/IconBox';
import { useMonitoringContext } from 'contexts/MonitoringContext';
import {
  MdSpeed,
  MdTimer,
  MdTrendingUp,
  MdTrendingDown,
  MdErrorOutline,
  MdCheckCircle,
  MdDeleteSweep,
  MdSearch,
  MdPlayArrow,
  MdRefresh,
  MdApi,
  MdNetworkCheck,
  MdWarning,
  MdImage,
  MdTextFields,
  MdCloudQueue,
  MdStorage,
} from 'react-icons/md';
import Chart from 'react-apexcharts';

// ─── Error Boundary ──────────────────────────────────────────────
class MonitoringErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[API Monitoring] Runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }} px="20px">
          <Alert
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            minH="300px"
            borderRadius="20px"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Monitoring Dashboard Error
            </AlertTitle>
            <AlertDescription maxWidth="md" mt={2}>
              <Text mb={2}>
                A runtime error occurred in the API Monitoring page.
              </Text>
              <Text fontSize="sm" color="red.400" fontFamily="mono">
                {this.state.error?.message || 'Unknown error'}
              </Text>
              <Button
                mt={4}
                colorScheme="red"
                variant="outline"
                onClick={() =>
                  this.setState({ hasError: false, error: null, errorInfo: null })
                }
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
const fmtMs = (ms) => {
  if (ms == null || isNaN(ms)) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const fmtBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
};

const statusColor = (status) => {
  if (!status || status === 0) return 'red';
  if (status >= 200 && status < 300) return 'green';
  if (status >= 300 && status < 400) return 'blue';
  if (status >= 400 && status < 500) return 'orange';
  return 'red';
};

const percentile = (arr, p) => {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

const RESOURCE_TYPE_META = {
  api: { label: 'API', color: 'purple', icon: MdApi },
  image: { label: 'Image', color: 'teal', icon: MdImage },
  font: { label: 'Font', color: 'cyan', icon: MdTextFields },
  cdn: { label: 'CDN', color: 'blue', icon: MdCloudQueue },
  media: { label: 'Media', color: 'pink', icon: MdStorage },
  other: { label: 'Other', color: 'gray', icon: MdNetworkCheck },
  unknown: { label: 'Unknown', color: 'gray', icon: MdNetworkCheck },
};

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ icon, iconBg, label, value, helpText, helpColor }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.400'
  );

  return (
    <Card py="18px" px="20px">
      <Flex align="center">
        <IconBox w="56px" h="56px" bg={iconBg} icon={icon} />
        <Stat ms="18px">
          <StatLabel color={textSecondary} fontSize="sm" lineHeight="100%">
            {label}
          </StatLabel>
          <StatNumber color={textColor} fontSize="2xl" mt="4px">
            {value}
          </StatNumber>
          {helpText && (
            <StatHelpText
              color={helpColor || textSecondary}
              fontSize="xs"
              mb="0"
              mt="2px"
            >
              {helpText}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Card>
  );
}

// ─── Resource Type Mini Card ─────────────────────────────────────
function ResourceTypeCard({ type, count, avgDuration, totalSize }) {
  const meta = RESOURCE_TYPE_META[type] || RESOURCE_TYPE_META.other;
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.400'
  );
  const bgColor = useColorModeValue('white', 'navy.800');

  return (
    <Card py="14px" px="16px" bg={bgColor}>
      <Flex align="center" gap="12px">
        <Flex
          w="40px"
          h="40px"
          borderRadius="10px"
          align="center"
          justify="center"
          bg={`${meta.color}.100`}
        >
          <Icon as={meta.icon} w="20px" h="20px" color={`${meta.color}.500`} />
        </Flex>
        <Box flex="1">
          <Flex justify="space-between" align="center">
            <Text color={textColor} fontSize="sm" fontWeight="700">
              {meta.label}
            </Text>
            <Badge
              colorScheme={meta.color}
              borderRadius="full"
              fontSize="xs"
              px="8px"
            >
              {count}
            </Badge>
          </Flex>
          <Flex gap="12px" mt="2px">
            <Text color={textSecondary} fontSize="xs">
              Avg: {fmtMs(avgDuration)}
            </Text>
            {totalSize > 0 && (
              <Text color={textSecondary} fontSize="xs">
                Size: {fmtBytes(totalSize)}
              </Text>
            )}
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
}

// ─── Main Dashboard Content ──────────────────────────────────────
function MonitoringDashboardContent() {
  const { requests, endpointStats, overallStats, resourceTypeStats, clearLogs } =
    useMonitoringContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL');
  const [testUrl, setTestUrl] = useState(
    'https://jsonplaceholder.typicode.com/posts/1'
  );
  const [testMethod, setTestMethod] = useState('GET');
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');

  // ── Color tokens ──
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue(
    'secondaryGray.600',
    'secondaryGray.400'
  );
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const tableBg = useColorModeValue('white', 'navy.800');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const cardShadow = useColorModeValue(
    '0px 18px 40px rgba(112, 144, 176, 0.12)',
    'unset'
  );

  // ── Derived stats ──
  const durations = useMemo(
    () => requests.map((r) => r.duration).filter((d) => d != null && !isNaN(d)),
    [requests]
  );

  const p95 = useMemo(() => percentile(durations, 95), [durations]);
  const p50 = useMemo(() => percentile(durations, 50), [durations]);

  const errorRate = useMemo(() => {
    if (requests.length === 0) return 0;
    const errors = requests.filter((r) => !r.success).length;
    return ((errors / requests.length) * 100).toFixed(1);
  }, [requests]);

  const successRate = useMemo(() => {
    if (requests.length === 0) return 0;
    return (100 - parseFloat(errorRate)).toFixed(1);
  }, [requests, errorRate]);

  const throughput = useMemo(() => {
    if (requests.length < 2) return '—';
    const timestamps = requests.map((r) => new Date(r.timestamp).getTime());
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const spanSec = (newest - oldest) / 1000;
    if (spanSec < 1) return `${requests.length} req`;
    const rps = requests.length / spanSec;
    return `${rps.toFixed(1)}/s`;
  }, [requests]);

  const totalTransferred = useMemo(() => {
    return requests.reduce((sum, r) => sum + (r.size || 0), 0);
  }, [requests]);

  // ── Filtered requests ──
  const filteredRequests = useMemo(() => {
    try {
      return requests.filter((r) => {
        if (
          searchTerm &&
          !(r.url || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(r.rawUrl || '').toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        if (methodFilter !== 'ALL' && r.method !== methodFilter) return false;
        if (statusFilter === 'SUCCESS' && !r.success) return false;
        if (statusFilter === 'ERROR' && r.success) return false;
        if (
          resourceTypeFilter !== 'ALL' &&
          r.resourceType !== resourceTypeFilter
        )
          return false;
        return true;
      });
    } catch {
      return requests;
    }
  }, [requests, searchTerm, methodFilter, statusFilter, resourceTypeFilter]);

  // ── Filtered endpoint stats ──
  const filteredEndpoints = useMemo(() => {
    try {
      let filtered = endpointStats;
      if (searchTerm) {
        filtered = filtered.filter((ep) =>
          (ep.url || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (resourceTypeFilter !== 'ALL') {
        filtered = filtered.filter(
          (ep) =>
            ep.resourceTypes &&
            ep.resourceTypes.includes(resourceTypeFilter)
        );
      }
      return filtered;
    } catch {
      return endpointStats;
    }
  }, [endpointStats, searchTerm, resourceTypeFilter]);

  // ── Response time distribution chart ──
  const distributionChart = useMemo(() => {
    if (durations.length === 0) {
      return { series: [{ name: 'Requests', data: [] }], categories: [] };
    }
    const buckets = [
      { label: '< 50ms', max: 50 },
      { label: '50-100', max: 100 },
      { label: '100-250', max: 250 },
      { label: '250-500', max: 500 },
      { label: '0.5-1s', max: 1000 },
      { label: '1-2s', max: 2000 },
      { label: '2-5s', max: 5000 },
      { label: '> 5s', max: Infinity },
    ];
    const counts = buckets.map(() => 0);
    durations.forEach((d) => {
      for (let i = 0; i < buckets.length; i++) {
        if (d < buckets[i].max || i === buckets.length - 1) {
          counts[i]++;
          break;
        }
      }
    });
    return {
      series: [{ name: 'Requests', data: counts }],
      categories: buckets.map((b) => b.label),
    };
  }, [durations]);

  // ── Timeline chart (recent requests) ──
  const timelineChart = useMemo(() => {
    const recent = [...requests].reverse().slice(-30);
    return {
      series: [
        {
          name: 'Response Time',
          data: recent.map((r) => ({
            x: new Date(r.timestamp).toLocaleTimeString(),
            y: Math.round(r.duration || 0),
          })),
        },
      ],
    };
  }, [requests]);

  // ── Resource type breakdown chart ──
  const resourceTypePieChart = useMemo(() => {
    if (resourceTypeStats.length === 0) {
      return { series: [], labels: [] };
    }
    return {
      series: resourceTypeStats.map((s) => s.count),
      labels: resourceTypeStats.map(
        (s) => (RESOURCE_TYPE_META[s.type] || RESOURCE_TYPE_META.other).label
      ),
    };
  }, [resourceTypeStats]);

  // ── Fire a test request ──
  const fireTestRequest = useCallback(async () => {
    if (!testUrl) {
      setTestError('Please enter a URL');
      return;
    }
    setIsTesting(true);
    setTestError('');
    try {
      const opts = { method: testMethod, mode: 'cors' };
      if (testMethod === 'POST') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify({ test: true, timestamp: Date.now() });
      }
      await fetch(testUrl, opts);
    } catch (err) {
      setTestError(`Request failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  }, [testUrl, testMethod]);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* ─── Header ─── */}
      <Flex
        mb="20px"
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap="10px"
      >
        <Flex align="center" gap="12px">
          <Box
            w="10px"
            h="10px"
            borderRadius="50%"
            bg={requests.length > 0 ? 'green.400' : 'gray.400'}
            boxShadow={
              requests.length > 0
                ? '0 0 8px rgba(72, 187, 120, 0.6)'
                : 'none'
            }
            animation={
              requests.length > 0
                ? 'pulse 2s ease-in-out infinite'
                : 'none'
            }
          />
          <Text color={textColor} fontSize="sm" fontWeight="500">
            {requests.length > 0
              ? `Tracking ${requests.length} network request${requests.length > 1 ? 's' : ''}`
              : 'Waiting for network activity...'}
          </Text>
        </Flex>
        <Button
          leftIcon={<MdDeleteSweep />}
          variant="outline"
          size="sm"
          colorScheme="red"
          onClick={clearLogs}
          isDisabled={requests.length === 0}
        >
          Clear Logs
        </Button>
      </Flex>

      {/* ─── Overview Stat Cards ─── */}
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, '2xl': 6 }}
        gap="20px"
        mb="20px"
      >
        <StatCard
          icon={<Icon w="28px" h="28px" as={MdApi} color="white" />}
          iconBg="linear-gradient(135deg, #868CFF 0%, #4318FF 100%)"
          label="Total Requests"
          value={overallStats.count}
          helpText={`Throughput: ${throughput}`}
        />
        <StatCard
          icon={<Icon w="28px" h="28px" as={MdSpeed} color="white" />}
          iconBg="linear-gradient(135deg, #3BC9DB 0%, #1098AD 100%)"
          label="Avg Response"
          value={fmtMs(overallStats.avgDuration)}
          helpText={`Median: ${fmtMs(p50)}`}
        />
        <StatCard
          icon={<Icon w="28px" h="28px" as={MdTrendingDown} color="white" />}
          iconBg="linear-gradient(135deg, #38D9A9 0%, #0CA678 100%)"
          label="Fastest (Min)"
          value={fmtMs(overallStats.minDuration)}
          helpText="Best case latency"
          helpColor="green.500"
        />
        <StatCard
          icon={<Icon w="28px" h="28px" as={MdTrendingUp} color="white" />}
          iconBg="linear-gradient(135deg, #FF6B6B 0%, #E03131 100%)"
          label="Slowest (Max)"
          value={fmtMs(overallStats.maxDuration)}
          helpText="Worst case latency"
          helpColor="red.400"
        />
        <StatCard
          icon={<Icon w="28px" h="28px" as={MdTimer} color="white" />}
          iconBg="linear-gradient(135deg, #FFA94D 0%, #F76707 100%)"
          label="P95 Latency"
          value={fmtMs(p95)}
          helpText="95th percentile"
        />
        <StatCard
          icon={
            <Icon
              w="28px"
              h="28px"
              as={
                parseFloat(errorRate) > 0 ? MdErrorOutline : MdCheckCircle
              }
              color="white"
            />
          }
          iconBg={
            parseFloat(errorRate) > 10
              ? 'linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)'
              : parseFloat(errorRate) > 0
              ? 'linear-gradient(135deg, #FFA94D 0%, #E8590C 100%)'
              : 'linear-gradient(135deg, #38D9A9 0%, #099268 100%)'
          }
          label="Success Rate"
          value={requests.length > 0 ? `${successRate}%` : '—'}
          helpText={
            requests.length > 0
              ? `${errorRate}% errors · ${fmtBytes(totalTransferred)} transferred`
              : 'No data yet'
          }
          helpColor={parseFloat(errorRate) > 0 ? 'red.400' : 'green.500'}
        />
      </SimpleGrid>

      {/* ─── Resource Type Breakdown Cards ─── */}
      {resourceTypeStats.length > 0 && (
        <SimpleGrid
          columns={{ base: 2, md: 3, lg: 6 }}
          gap="12px"
          mb="20px"
        >
          {resourceTypeStats.map((st) => (
            <ResourceTypeCard
              key={st.type}
              type={st.type}
              count={st.count}
              avgDuration={st.count > 0 ? st.totalDuration / st.count : 0}
              totalSize={st.totalSize}
            />
          ))}
        </SimpleGrid>
      )}

      {/* ─── Charts Row ─── */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="20px" mb="20px">
        {/* Response Time Distribution */}
        <Card p="20px" boxShadow={cardShadow}>
          <Text color={textColor} fontSize="lg" fontWeight="700" mb="16px">
            Response Time Distribution
          </Text>
          {durations.length === 0 ? (
            <Flex
              h="250px"
              align="center"
              justify="center"
              direction="column"
              gap="8px"
            >
              <Icon
                as={MdNetworkCheck}
                w="40px"
                h="40px"
                color={textSecondary}
              />
              <Text color={textSecondary} fontSize="sm">
                Make some API calls to see distribution
              </Text>
            </Flex>
          ) : (
            <Chart
              options={{
                chart: {
                  type: 'bar',
                  toolbar: { show: false },
                  fontFamily: 'inherit',
                },
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: '60%',
                    distributed: true,
                  },
                },
                colors: [
                  '#38D9A9',
                  '#3BC9DB',
                  '#4DABF7',
                  '#748FFC',
                  '#9775FA',
                  '#DA77F2',
                  '#FFA94D',
                  '#FF6B6B',
                ],
                dataLabels: { enabled: false },
                legend: { show: false },
                xaxis: {
                  categories: distributionChart.categories,
                  labels: {
                    style: { fontSize: '10px' },
                    rotate: -45,
                    rotateAlways: true,
                  },
                },
                yaxis: {
                  title: { text: 'Count' },
                  labels: { formatter: (v) => Math.round(v) },
                },
                tooltip: {
                  y: {
                    formatter: (v) =>
                      `${v} request${v !== 1 ? 's' : ''}`,
                  },
                },
                grid: { borderColor: 'rgba(0,0,0,0.05)' },
              }}
              series={distributionChart.series}
              type="bar"
              height={260}
            />
          )}
        </Card>

        {/* Response Time Timeline */}
        <Card p="20px" boxShadow={cardShadow}>
          <Text color={textColor} fontSize="lg" fontWeight="700" mb="16px">
            Response Time Timeline
          </Text>
          {requests.length === 0 ? (
            <Flex
              h="250px"
              align="center"
              justify="center"
              direction="column"
              gap="8px"
            >
              <Icon
                as={MdNetworkCheck}
                w="40px"
                h="40px"
                color={textSecondary}
              />
              <Text color={textSecondary} fontSize="sm">
                Make some API calls to see timeline
              </Text>
            </Flex>
          ) : (
            <Chart
              options={{
                chart: {
                  type: 'area',
                  toolbar: { show: false },
                  fontFamily: 'inherit',
                },
                stroke: { curve: 'smooth', width: 3 },
                colors: ['#4318FF'],
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.05,
                    stops: [0, 100],
                  },
                },
                dataLabels: { enabled: false },
                xaxis: {
                  labels: {
                    show: true,
                    rotate: -45,
                    style: { fontSize: '9px' },
                  },
                },
                yaxis: {
                  title: { text: 'ms' },
                  labels: { formatter: (v) => `${Math.round(v)}ms` },
                },
                tooltip: { y: { formatter: (v) => `${v}ms` } },
                grid: { borderColor: 'rgba(0,0,0,0.05)' },
              }}
              series={timelineChart.series}
              type="area"
              height={260}
            />
          )}
        </Card>

        {/* Resource Type Pie */}
        <Card p="20px" boxShadow={cardShadow}>
          <Text color={textColor} fontSize="lg" fontWeight="700" mb="16px">
            Network by Resource Type
          </Text>
          {resourceTypePieChart.series.length === 0 ? (
            <Flex
              h="250px"
              align="center"
              justify="center"
              direction="column"
              gap="8px"
            >
              <Icon
                as={MdCloudQueue}
                w="40px"
                h="40px"
                color={textSecondary}
              />
              <Text color={textSecondary} fontSize="sm">
                No network data yet
              </Text>
            </Flex>
          ) : (
            <Chart
              options={{
                chart: { type: 'donut', fontFamily: 'inherit' },
                labels: resourceTypePieChart.labels,
                colors: [
                  '#7C3AED',
                  '#0D9488',
                  '#0891B2',
                  '#2563EB',
                  '#EC4899',
                  '#9CA3AF',
                ],
                legend: { position: 'bottom', fontSize: '12px' },
                dataLabels: {
                  enabled: true,
                  formatter: (val) => `${val.toFixed(0)}%`,
                },
                plotOptions: {
                  pie: {
                    donut: {
                      size: '55%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: 'Total',
                          formatter: (w) =>
                            w.globals.seriesTotals
                              .reduce((a, b) => a + b, 0)
                              .toString(),
                        },
                      },
                    },
                  },
                },
                stroke: { width: 0 },
              }}
              series={resourceTypePieChart.series}
              type="donut"
              height={280}
            />
          )}
        </Card>
      </SimpleGrid>

      {/* ─── Filters ─── */}
      <Card p="16px" mb="20px" boxShadow={cardShadow}>
        <Flex gap="12px" flexWrap="wrap" align="center">
          <InputGroup maxW="320px">
            <InputLeftElement>
              <Icon as={MdSearch} color={textSecondary} />
            </InputLeftElement>
            <Input
              placeholder="Filter by URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="md"
              borderRadius="12px"
            />
          </InputGroup>
          <Select
            maxW="140px"
            borderRadius="12px"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </Select>
          <Select
            maxW="140px"
            borderRadius="12px"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="ERROR">Error</option>
          </Select>
          <Select
            maxW="160px"
            borderRadius="12px"
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="api">API Calls</option>
            <option value="image">Images</option>
            <option value="font">Fonts</option>
            <option value="cdn">CDN</option>
            <option value="media">Media</option>
            <option value="other">Other</option>
          </Select>
          <Badge
            colorScheme="brand"
            fontSize="xs"
            borderRadius="8px"
            px="10px"
            py="4px"
          >
            {filteredRequests.length} / {requests.length} shown
          </Badge>
        </Flex>
      </Card>

      {/* ─── Tabs: Endpoints / Live Log / Test Panel ─── */}
      <Card boxShadow={cardShadow} overflow="hidden">
        <Tabs variant="enclosed" colorScheme="brand">
          <TabList
            px="20px"
            pt="16px"
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <Tab fontWeight="600" fontSize="sm">
              <Icon as={MdSpeed} mr="6px" /> Endpoint Breakdown
            </Tab>
            <Tab fontWeight="600" fontSize="sm">
              <Icon as={MdNetworkCheck} mr="6px" /> Live Network Log
            </Tab>
            <Tab fontWeight="600" fontSize="sm">
              <Icon as={MdPlayArrow} mr="6px" /> Test API
            </Tab>
          </TabList>

          <TabPanels>
            {/* ── Endpoint Breakdown ── */}
            <TabPanel p="0">
              {filteredEndpoints.length === 0 ? (
                <Flex
                  p="60px"
                  direction="column"
                  align="center"
                  gap="12px"
                >
                  <Icon
                    as={MdApi}
                    w="48px"
                    h="48px"
                    color={textSecondary}
                  />
                  <Text
                    color={textSecondary}
                    fontSize="md"
                    fontWeight="500"
                  >
                    No endpoint data yet
                  </Text>
                  <Text color={textSecondary} fontSize="sm">
                    Use the "Test API" tab or browse around — images, fonts
                    &amp; CDN loads all show up here
                  </Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th color={textSecondary} borderColor={borderColor}>
                          Endpoint
                        </Th>
                        <Th color={textSecondary} borderColor={borderColor}>
                          Type
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Calls
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Avg
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Min
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Max
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Size
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Errors
                        </Th>
                        <Th color={textSecondary} borderColor={borderColor}>
                          Health
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredEndpoints.map((ep, i) => {
                        const epErrorRate =
                          ep.count > 0
                            ? (
                                (ep.errorCount / ep.count) *
                                100
                              ).toFixed(0)
                            : 0;
                        const healthColor =
                          epErrorRate > 50
                            ? 'red'
                            : epErrorRate > 10
                            ? 'orange'
                            : 'green';

                        return (
                          <Tr
                            key={ep.url || i}
                            _hover={{ bg: hoverBg }}
                            transition="background 0.15s"
                          >
                            <Td
                              borderColor={borderColor}
                              maxW="280px"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              <Tooltip
                                label={ep.url}
                                placement="top-start"
                              >
                                <Text
                                  color={textColor}
                                  fontSize="sm"
                                  fontWeight="600"
                                  fontFamily="mono"
                                >
                                  {ep.url || 'unknown'}
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td borderColor={borderColor}>
                              <Flex gap="4px" flexWrap="wrap">
                                {(ep.resourceTypes || []).map((rt) => {
                                  const m =
                                    RESOURCE_TYPE_META[rt] ||
                                    RESOURCE_TYPE_META.other;
                                  return (
                                    <Tag
                                      key={rt}
                                      size="sm"
                                      colorScheme={m.color}
                                      borderRadius="full"
                                    >
                                      <TagLabel fontSize="xs">
                                        {m.label}
                                      </TagLabel>
                                    </Tag>
                                  );
                                })}
                              </Flex>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Tag
                                size="sm"
                                colorScheme="brand"
                                borderRadius="full"
                              >
                                <TagLabel>{ep.count}</TagLabel>
                              </Tag>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                fontWeight="700"
                                color={
                                  ep.avgDuration > 1000
                                    ? 'red.400'
                                    : ep.avgDuration > 500
                                    ? 'orange.400'
                                    : textColor
                                }
                                fontSize="sm"
                              >
                                {fmtMs(ep.avgDuration)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                color="green.500"
                                fontSize="sm"
                                fontWeight="600"
                              >
                                {fmtMs(ep.minDuration)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                color="red.400"
                                fontSize="sm"
                                fontWeight="600"
                              >
                                {fmtMs(ep.maxDuration)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text color={textSecondary} fontSize="sm">
                                {fmtBytes(ep.totalSize)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                color={
                                  ep.errorCount > 0
                                    ? 'red.400'
                                    : textSecondary
                                }
                                fontSize="sm"
                                fontWeight={
                                  ep.errorCount > 0 ? '700' : '400'
                                }
                              >
                                {ep.errorCount}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor}>
                              <Flex align="center" gap="8px">
                                <Progress
                                  value={100 - parseFloat(epErrorRate)}
                                  colorScheme={healthColor}
                                  size="sm"
                                  borderRadius="full"
                                  w="60px"
                                />
                                <Text fontSize="xs" color={textSecondary}>
                                  {100 - parseInt(epErrorRate)}%
                                </Text>
                              </Flex>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* ── Live Network Log ── */}
            <TabPanel p="0">
              {filteredRequests.length === 0 ? (
                <Flex
                  p="60px"
                  direction="column"
                  align="center"
                  gap="12px"
                >
                  <Icon
                    as={MdNetworkCheck}
                    w="48px"
                    h="48px"
                    color={textSecondary}
                  />
                  <Text
                    color={textSecondary}
                    fontSize="md"
                    fontWeight="500"
                  >
                    No requests captured yet
                  </Text>
                  <Text color={textSecondary} fontSize="sm">
                    All network activity (API calls, images, fonts, CDN
                    loads) will appear here in real-time
                  </Text>
                </Flex>
              ) : (
                <Box overflowX="auto" maxH="500px" overflowY="auto">
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} bg={tableBg} zIndex={1}>
                      <Tr>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          Time
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          Method
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          URL
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Status
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Duration
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                          isNumeric
                        >
                          Size
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          Type
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          Source
                        </Th>
                        <Th
                          color={textSecondary}
                          borderColor={borderColor}
                        >
                          Result
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredRequests.map((req) => {
                        const rtMeta =
                          RESOURCE_TYPE_META[req.resourceType] ||
                          RESOURCE_TYPE_META.other;
                        return (
                          <Tr
                            key={req.id}
                            _hover={{ bg: hoverBg }}
                            transition="background 0.15s"
                            opacity={req.success ? 1 : 0.9}
                          >
                            <Td
                              borderColor={borderColor}
                              whiteSpace="nowrap"
                            >
                              <Text
                                color={textSecondary}
                                fontSize="xs"
                                fontFamily="mono"
                              >
                                {(() => {
                                  try {
                                    return new Date(
                                      req.timestamp
                                    ).toLocaleTimeString();
                                  } catch {
                                    return '—';
                                  }
                                })()}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor}>
                              <Badge
                                colorScheme={
                                  req.method === 'GET'
                                    ? 'green'
                                    : req.method === 'POST'
                                    ? 'blue'
                                    : req.method === 'PUT'
                                    ? 'orange'
                                    : req.method === 'DELETE'
                                    ? 'red'
                                    : 'gray'
                                }
                                fontSize="xs"
                                borderRadius="6px"
                                px="8px"
                              >
                                {req.method}
                              </Badge>
                            </Td>
                            <Td
                              borderColor={borderColor}
                              maxW="260px"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              <Tooltip
                                label={req.rawUrl || req.url}
                                placement="top-start"
                              >
                                <Text
                                  color={textColor}
                                  fontSize="xs"
                                  fontFamily="mono"
                                >
                                  {req.url || '—'}
                                </Text>
                              </Tooltip>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Badge
                                colorScheme={statusColor(req.status)}
                                variant="subtle"
                                fontSize="xs"
                                borderRadius="6px"
                                px="8px"
                              >
                                {req.status || 'ERR'}
                              </Badge>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                fontWeight="700"
                                fontSize="sm"
                                color={
                                  req.duration > 1000
                                    ? 'red.400'
                                    : req.duration > 500
                                    ? 'orange.400'
                                    : 'green.500'
                                }
                              >
                                {fmtMs(req.duration)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor} isNumeric>
                              <Text
                                color={textSecondary}
                                fontSize="xs"
                              >
                                {fmtBytes(req.size)}
                              </Text>
                            </Td>
                            <Td borderColor={borderColor}>
                              <Tag
                                size="sm"
                                colorScheme={rtMeta.color}
                                borderRadius="full"
                              >
                                <TagLabel fontSize="xs">
                                  {rtMeta.label}
                                </TagLabel>
                              </Tag>
                            </Td>
                            <Td borderColor={borderColor}>
                              <Tag
                                size="sm"
                                variant="outline"
                                colorScheme={
                                  req.type === 'fetch'
                                    ? 'purple'
                                    : req.type === 'xhr'
                                    ? 'cyan'
                                    : 'orange'
                                }
                                borderRadius="full"
                              >
                                <TagLabel fontSize="xs">
                                  {req.type}
                                </TagLabel>
                              </Tag>
                            </Td>
                            <Td borderColor={borderColor}>
                              {req.success ? (
                                <Icon
                                  as={MdCheckCircle}
                                  color="green.400"
                                  w="18px"
                                  h="18px"
                                />
                              ) : (
                                <Tooltip
                                  label={
                                    req.error || `HTTP ${req.status}`
                                  }
                                >
                                  <span>
                                    <Icon
                                      as={MdWarning}
                                      color="red.400"
                                      w="18px"
                                      h="18px"
                                    />
                                  </span>
                                </Tooltip>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* ── Test API Panel ── */}
            <TabPanel p="24px">
              <Text color={textColor} fontSize="md" fontWeight="700" mb="4px">
                Send a Test Request
              </Text>
              <Text color={textSecondary} fontSize="sm" mb="20px">
                Fire real HTTP requests to any URL. The interceptor will
                capture timing metrics automatically. Images, CDN and font
                loads from page navigation are also tracked.
              </Text>

              <Flex gap="12px" mb="16px" flexWrap="wrap">
                <Select
                  maxW="120px"
                  borderRadius="12px"
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value)}
                  fontWeight="600"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </Select>
                <Input
                  flex="1"
                  minW="280px"
                  borderRadius="12px"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  fontFamily="mono"
                  fontSize="sm"
                />
                <Button
                  leftIcon={
                    isTesting ? <Spinner size="xs" /> : <MdPlayArrow />
                  }
                  colorScheme="brand"
                  borderRadius="12px"
                  onClick={fireTestRequest}
                  isLoading={isTesting}
                  loadingText="Sending..."
                  px="24px"
                >
                  Send
                </Button>
              </Flex>

              {testError && (
                <Alert status="warning" borderRadius="12px" mb="16px">
                  <AlertIcon />
                  <Text fontSize="sm">{testError}</Text>
                </Alert>
              )}

              {/* Quick test buttons */}
              <Text
                color={textSecondary}
                fontSize="xs"
                fontWeight="600"
                mb="8px"
                textTransform="uppercase"
              >
                Quick Tests — APIs
              </Text>
              <Flex gap="8px" flexWrap="wrap" mb="16px">
                {[
                  {
                    label: 'JSON Placeholder',
                    url: 'https://jsonplaceholder.typicode.com/posts/1',
                  },
                  {
                    label: 'Random User',
                    url: 'https://randomuser.me/api/',
                  },
                  {
                    label: 'HTTPBin Get',
                    url: 'https://httpbin.org/get',
                  },
                  {
                    label: 'HTTPBin Delay 1s',
                    url: 'https://httpbin.org/delay/1',
                  },
                  {
                    label: 'HTTPBin Delay 3s',
                    url: 'https://httpbin.org/delay/3',
                  },
                  {
                    label: '404 Test',
                    url: 'https://httpbin.org/status/404',
                  },
                  {
                    label: '500 Test',
                    url: 'https://httpbin.org/status/500',
                  },
                  {
                    label: 'Invalid URL',
                    url: 'https://this-domain-does-not-exist-12345.com/api',
                  },
                ].map((t) => (
                  <Button
                    key={t.url}
                    size="sm"
                    variant="outline"
                    borderRadius="full"
                    fontSize="xs"
                    onClick={() => {
                      setTestUrl(t.url);
                      setTestMethod('GET');
                    }}
                    _hover={{
                      bg: brandColor,
                      color: 'white',
                      borderColor: brandColor,
                    }}
                    transition="all 0.2s"
                  >
                    {t.label}
                  </Button>
                ))}
              </Flex>

              {/* Quick test — images & CDN */}
              <Text
                color={textSecondary}
                fontSize="xs"
                fontWeight="600"
                mb="8px"
                textTransform="uppercase"
              >
                Quick Tests — Images &amp; CDN
              </Text>
              <Flex gap="8px" flexWrap="wrap" mb="16px">
                {[
                  {
                    label: 'Picsum Photo',
                    url: 'https://picsum.photos/200/200',
                  },
                  {
                    label: 'Placeholder Image',
                    url: 'https://via.placeholder.com/150',
                  },
                  {
                    label: 'CDN jQuery',
                    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
                  },
                  {
                    label: 'Google Font CSS',
                    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700',
                  },
                ].map((t) => (
                  <Button
                    key={t.url}
                    size="sm"
                    variant="outline"
                    borderRadius="full"
                    fontSize="xs"
                    colorScheme="teal"
                    onClick={() => {
                      setTestUrl(t.url);
                      setTestMethod('GET');
                    }}
                    _hover={{
                      bg: 'teal.500',
                      color: 'white',
                    }}
                    transition="all 0.2s"
                  >
                    {t.label}
                  </Button>
                ))}
              </Flex>

              {/* Batch fire */}
              <Flex mt="8px" gap="12px" align="center">
                <Button
                  leftIcon={<MdRefresh />}
                  size="sm"
                  colorScheme="purple"
                  variant="outline"
                  borderRadius="12px"
                  onClick={async () => {
                    const urls = [
                      'https://jsonplaceholder.typicode.com/posts/1',
                      'https://jsonplaceholder.typicode.com/users/1',
                      'https://jsonplaceholder.typicode.com/comments/1',
                      'https://randomuser.me/api/',
                      'https://httpbin.org/get',
                    ];
                    for (const url of urls) {
                      try {
                        await fetch(url, { mode: 'cors' });
                      } catch {
                        // errors are tracked by the interceptor
                      }
                    }
                  }}
                >
                  Fire 5 API Requests
                </Button>
                <Text color={textSecondary} fontSize="xs">
                  Quickly populate data with multiple API calls
                </Text>
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>

      {/* ─── Pulse animation keyframes ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </Box>
  );
}

// ─── Exported with Error Boundary ────────────────────────────────
export default function MonitoringDashboard() {
  return (
    <MonitoringErrorBoundary>
      <MonitoringDashboardContent />
    </MonitoringErrorBoundary>
  );
}
